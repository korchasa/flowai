#!/usr/bin/env -S deno run --allow-read --allow-run=git --allow-env=FLOWAI_DOC_ANCHORS_SKIP

/**
 * doc-anchors-validate hook — turn-end (`Stop`) SALP anchor/ref integrity check.
 * [REF:fr:doc-anchors.hook | FR-DOC-ANCHORS.HOOK]
 *
 * On the agent's turn-end the repo is in a SETTLED state: in-turn forward-refs
 * and rename chicken-and-egg have resolved, so the only findings are genuinely
 * dangling refs / duplicate anchors / malformed tokens. Findings are fed back
 * to the AGENT (`decision: block` + `reason`); the reason prescribes the fix
 * method itself — delegate the mechanical fix to a SUBAGENT, then resume the
 * primary task (no forced stop) — so clean-up never derails the main thread.
 *
 * Anti-loop: Claude Code sets stdin `stop_hook_active: true` when the current
 * stop is itself the result of a prior Stop-hook block. We then exit 0 silently
 * — bounding the mechanism to a single forced follow-up turn when the agent
 * does not / cannot fix the findings.
 *
 * Scan set: in a git work tree the file list comes from `git ls-files`
 * (`.gitignore`d paths are never scanned); outside a repo it falls back to a
 * manual walk with a hard-coded denylist. A consuming project narrows the scan
 * two further ways, both additive to the built-ins:
 *   1. `.salpignore` dot-files — committed, `.gitignore`-style glob lists. A
 *      `.salpignore` applies to its own directory subtree (patterns are matched
 *      relative to that directory); deeper files override shallower ones, `!`
 *      re-includes, `#` comments and blank lines are skipped. This is the
 *      preferred mechanism: it lives in the repo next to the fixtures it
 *      silences, so the exclusion travels with the code.
 *   2. `FLOWAI_DOC_ANCHORS_SKIP` env var — comma-separated path substrings, for
 *      ad-hoc/non-committed skips of layouts that differ from flowai's own.
 * Distribution runs the hook via `deno run -A`, so the `git` subprocess, the
 * env read, and the `.salpignore` reads are permitted.
 *
 * Single-file by design: the SALP parser is inlined (no sibling imports) so the
 * hook runs from `.{ide}/scripts/` in a user repo even though distribution
 * copies only `run.ts`. Fail-open: any internal error exits 0 (never disrupts
 * the user's session). Parser mirrors the pure core from `scripts/lib/salp.ts`.
 */

import { dirname, join } from "jsr:@std/path";

// ---------------------------------------------------------------------------
// Inlined SALP parser (pure; no I/O). Grammar (examples in backticks so the
// dev-side SALP validator does not read them as real tokens):
//   Anchor:    `[ANC:<ns>:<id>]`
//   Reference: `[REF:<ns>:<id>]` or `[REF:<ns>:<id> | <display>]`
//   <ns> = [a-z][a-z0-9-]*; <id> = lower-kebab with hierarchical dots.
// salp-short (`[ANC:id]` / `[REF:id]`, no namespace) is rejected.
// ---------------------------------------------------------------------------

type SalpPos = { line: number; col: number };
type SalpAnchor = { ns: string; id: string; pos: SalpPos };
type SalpRef = { ns: string; id: string; display?: string; pos: SalpPos };

class SalpSyntaxError extends Error {
  constructor(
    message: string,
    readonly pos: SalpPos,
    readonly snippet: string,
  ) {
    super(`${message} at line ${pos.line}, col ${pos.col}: ${snippet}`);
    this.name = "SalpSyntaxError";
  }
}

const NS_RE = "[a-z][a-z0-9-]*";
const ID_RE = "[a-z0-9](?:[a-z0-9-]*(?:\\.[a-z0-9][a-z0-9-]*)*)?";
const ANC_OK_RE = new RegExp(`^\\[ANC:(${NS_RE}):(${ID_RE})\\]$`);
const REF_OK_RE = new RegExp(
  `^\\[REF:(${NS_RE}):(${ID_RE})(?:\\s*\\|\\s*([^\\]]+?))?\\]$`,
);
const ANC_SCAN_RE = /\[ANC:([^\]]*)\]/g;
const REF_SCAN_RE = /\[REF:([^\]]*)\]/g;

function hasSalpTokens(text: string): boolean {
  return /\[(?:ANC|REF):/.test(text);
}

function parseAnchors(text: string): SalpAnchor[] {
  return scanTokens(text, ANC_SCAN_RE, (raw, body, pos) => {
    const m = raw.match(ANC_OK_RE);
    if (!m) {
      throw new SalpSyntaxError(
        body.includes(":")
          ? "Invalid SALP anchor grammar"
          : "SALP anchor must include namespace (salp-short form rejected)",
        pos,
        raw,
      );
    }
    return { ns: m[1], id: m[2], pos };
  });
}

function parseRefs(text: string): SalpRef[] {
  return scanTokens(text, REF_SCAN_RE, (raw, body, pos) => {
    const m = raw.match(REF_OK_RE);
    if (!m) {
      throw new SalpSyntaxError(
        body.includes(":")
          ? "Invalid SALP ref grammar"
          : "SALP ref must include namespace (salp-short form rejected)",
        pos,
        raw,
      );
    }
    const display = m[3]?.trim();
    const ref: SalpRef = { ns: m[1], id: m[2], pos };
    if (display) ref.display = display;
    return ref;
  });
}

function scanTokens<T>(
  text: string,
  scan: RegExp,
  build: (raw: string, body: string, pos: SalpPos) => T,
): T[] {
  const out: T[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    scan.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = scan.exec(line)) !== null) {
      out.push(build(m[0], m[1], { line: i + 1, col: m.index + 1 }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hook logic.
// ---------------------------------------------------------------------------

export type FindingKind = "dead-ref" | "duplicate-anchor" | "syntax-error";

export type Finding = {
  kind: FindingKind;
  file: string;
  line: number;
  col: number;
  message: string;
};

export type StopHookInput = {
  stop_hook_active?: boolean;
  cwd?: string;
};

export type Decision = { block: boolean; reason?: string };

const TEXT_EXTENSIONS = new Set([".md", ".ts", ".js", ".yaml", ".yml"]);
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".claude",
  ".cursor",
  ".opencode",
  ".agents",
  ".codex",
]);

/**
 * Path-substring exclusions, mirroring the dev-side validator
 * (`scripts/check-salp.ts` SKIP_PATH_PATTERNS). These surfaces carry
 * illustrative or generated SALP tokens that are NOT real cross-references:
 *  - `/acceptance-tests/runs/` + `/acceptance-tests/cache/` — generated run
 *    artifacts (judge-evidence, sandbox copies); gitignored, regenerated.
 *  - `/fixture/` + `/migrate-to-salp.fixtures/` — committed test inputs whose
 *    refs deliberately dangle (anchor lives outside the fixture's scope).
 *  - `_test.ts` — meta-tests of the parser containing intentional bad grammar.
 * Without these, the hook flags transient/intentional tokens as repo defects.
 * A consuming project extends the list at runtime via `FLOWAI_DOC_ANCHORS_SKIP`
 * (see readSkipEnv) — its raw layout may differ (e.g. `fixtures/` plural).
 */
const SKIP_PATH_PATTERNS = [
  /(?:^|\/)acceptance-tests\/runs(?:\/|$)/,
  /(?:^|\/)acceptance-tests\/cache(?:\/|$)/,
  /(?:^|\/)fixture(?:\/|$)/,
  /(?:^|\/)migrate-to-salp\.fixtures(?:\/|$)/,
  /_test\.ts$/,
];

/**
 * Project-supplied skip list. `FLOWAI_DOC_ANCHORS_SKIP` is a comma-separated
 * set of path substrings; any file whose path contains an entry is skipped.
 * This lets a repo whose fixture/example layout differs from flowai's own
 * conventions silence its intentional SALP tokens without code changes.
 */
export function readSkipEnv(): string[] {
  const raw = Deno.env.get("FLOWAI_DOC_ANCHORS_SKIP") ?? "";
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

/** True when `path` is an excluded surface: a built-in SKIP_PATH_PATTERN, or a
 *  plain substring match against any project-supplied `extra` skip entry. */
export function isSkippedPath(path: string, extra: string[] = []): boolean {
  if (SKIP_PATH_PATTERNS.some((re) => re.test(path))) return true;
  return extra.some((sub) => path.includes(sub));
}

// ---------------------------------------------------------------------------
// `.salpignore` — committed, per-directory, `.gitignore`-style exclusion lists.
// A `.salpignore` lives in some directory and its patterns are matched against
// each candidate file's path RELATIVE to that directory. This lets a repo park
// the exclusion right next to the fixtures it silences (e.g. an experiment's
// `fixtures/` tree of intentionally-malformed/duplicate tokens) instead of
// threading an env var through every invocation.
// ---------------------------------------------------------------------------

/** Basename of the per-directory ignore file. */
export const SALP_IGNORE_FILE = ".salpignore";

/** One compiled `.salpignore` line. `negated` (`!pattern`) re-includes a path
 *  excluded by an earlier line. */
type IgnorePattern = { negated: boolean; re: RegExp };

/** A parsed `.salpignore`: its directory (absolute) + ordered patterns. */
export type SalpIgnore = { dir: string; patterns: IgnorePattern[] };

/** Translate the literal/glob body of a `.salpignore` pattern into a regex
 *  fragment. `*` matches within a segment, `**` across separators, `?` a single
 *  non-separator char; every other regex metachar is escaped. */
function globToRegExpBody(glob: string): string {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++; // consume the second '*'
        re += ".*";
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "/") {
      re += "/";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return re;
}

/** Compile a single `.salpignore` line into a pattern, or null for blank /
 *  comment lines. Mirrors `.gitignore` anchoring rules: a leading or interior
 *  `/` anchors to the `.salpignore`'s own directory; otherwise the pattern
 *  matches at any depth. A trailing `/` restricts the match to directory
 *  contents. */
function buildIgnorePattern(raw: string): IgnorePattern | null {
  let s = raw.replace(/\s+$/, "");
  if (s.length === 0 || s.startsWith("#")) return null;

  let negated = false;
  if (s.startsWith("!")) {
    negated = true;
    s = s.slice(1);
  }
  let anchored = false;
  if (s.startsWith("/")) {
    anchored = true;
    s = s.slice(1);
  }
  let dirOnly = false;
  if (s.endsWith("/")) {
    dirOnly = true;
    s = s.slice(0, -1);
  }
  if (s.length === 0) return null;
  if (s.includes("/")) anchored = true; // interior slash also anchors

  const prefix = anchored ? "^" : "^(?:.*/)?";
  const suffix = dirOnly ? "/.*$" : "(?:/.*)?$";
  return { negated, re: new RegExp(prefix + globToRegExpBody(s) + suffix) };
}

/** Parse a `.salpignore` body (rooted at `dir`) into ordered patterns. */
export function parseSalpIgnore(dir: string, content: string): SalpIgnore {
  const patterns: IgnorePattern[] = [];
  for (const raw of content.split("\n")) {
    const p = buildIgnorePattern(raw);
    if (p) patterns.push(p);
  }
  return { dir, patterns };
}

/**
 * True when `fullPath` is excluded by any of the discovered `.salpignore`
 * files. `ignores` MUST be ordered shallowest-directory-first so a deeper
 * `.salpignore` (and its `!` negations) overrides a shallower one. Within one
 * file the last matching pattern wins (`.gitignore` semantics).
 */
export function isIgnoredBySalpIgnore(
  fullPath: string,
  ignores: ReadonlyArray<SalpIgnore>,
): boolean {
  let ignored = false;
  for (const ig of ignores) {
    if (!fullPath.startsWith(ig.dir + "/")) continue;
    const rel = fullPath.slice(ig.dir.length + 1);
    for (const p of ig.patterns) {
      if (p.re.test(rel)) ignored = !p.negated;
    }
  }
  return ignored;
}

/** Read + parse the discovered `.salpignore` files, ordered shallow→deep so
 *  deeper files override. Unreadable files are skipped (fail-open). */
async function loadSalpIgnores(paths: string[]): Promise<SalpIgnore[]> {
  const out: SalpIgnore[] = [];
  for (const p of paths) {
    try {
      out.push(parseSalpIgnore(dirname(p), await Deno.readTextFile(p)));
    } catch {
      // unreadable .salpignore — ignore, fail-open
    }
  }
  out.sort((a, b) => a.dir.length - b.dir.length);
  return out;
}

/** Strip contexts where SALP tokens are illustrative, not real references:
 *  markdown fenced blocks + inline `code`; in `.ts`/`.js` keep only comment
 *  lines (SALP tokens in source live in doc comments). Line count preserved. */
function stripNonReferenceContext(file: string, content: string): string {
  if (file.endsWith(".md")) return stripMarkdownCodeSpans(content);
  if (file.endsWith(".ts") || file.endsWith(".js")) {
    return keepOnlyCommentLines(content);
  }
  return content;
}

function stripMarkdownCodeSpans(content: string): string {
  const lines = content.split("\n");
  let inFence = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^[ \t]*```/.test(line)) {
      inFence = !inFence;
      out.push("");
      continue;
    }
    if (inFence) {
      out.push("");
      continue;
    }
    out.push(line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length)));
  }
  return out.join("\n");
}

function keepOnlyCommentLines(content: string): string {
  const lines = content.split("\n");
  let inBlockComment = false;
  const out: string[] = [];
  for (const line of lines) {
    let keep = false;
    if (inBlockComment) {
      keep = true;
      if (line.includes("*/")) inBlockComment = false;
    } else if (/\/\*/.test(line) && !/\*\/[ \t]*$/.test(line)) {
      keep = true;
      inBlockComment = true;
    } else if (/^[ \t]*\/\//.test(line)) {
      keep = true;
    }
    if (keep) out.push(line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length)));
    else out.push("");
  }
  return out.join("\n");
}

/**
 * Pure detector: given the settled set of files, report SALP integrity issues
 * — malformed tokens (syntax-error), anchors sharing one {ns:id}
 * (duplicate-anchor), and refs with no resolving anchor (dead-ref).
 */
export function findIssues(
  files: ReadonlyArray<{ path: string; content: string }>,
): Finding[] {
  const findings: Finding[] = [];
  const anchorIndex = new Map<string, Array<{ file: string; line: number }>>();
  const refs: Array<
    { key: string; raw: string; file: string; line: number; col: number }
  > = [];

  for (const { path, content } of files) {
    const stripped = stripNonReferenceContext(path, content);
    if (!hasSalpTokens(stripped)) continue;
    try {
      for (const a of parseAnchors(stripped)) {
        const key = `${a.ns}:${a.id}`;
        const list = anchorIndex.get(key) ?? [];
        list.push({ file: path, line: a.pos.line });
        anchorIndex.set(key, list);
      }
      for (const r of parseRefs(stripped)) {
        refs.push({
          key: `${r.ns}:${r.id}`,
          raw: `[REF:${r.ns}:${r.id}]`,
          file: path,
          line: r.pos.line,
          col: r.pos.col,
        });
      }
    } catch (e) {
      if (e instanceof SalpSyntaxError) {
        findings.push({
          kind: "syntax-error",
          file: path,
          line: e.pos.line,
          col: e.pos.col,
          message: `malformed SALP token: ${e.snippet}`,
        });
        continue;
      }
      throw e;
    }
  }

  for (const [key, occ] of anchorIndex) {
    if (occ.length > 1) {
      findings.push({
        kind: "duplicate-anchor",
        file: occ[1].file,
        line: occ[1].line,
        col: 1,
        message: `duplicate [ANC:${key}] — ${occ.length} occurrences (${
          occ.map((o) => `${o.file}:${o.line}`).join(", ")
        })`,
      });
    }
  }

  for (const r of refs) {
    if (!anchorIndex.has(r.key)) {
      findings.push({
        kind: "dead-ref",
        file: r.file,
        line: r.line,
        col: r.col,
        message: `dead ref ${r.raw} → no [ANC:${r.key}] declared anywhere`,
      });
    }
  }

  return findings;
}

/** Decide whether to block the Stop and what to tell the agent. */
export function decide(input: StopHookInput, findings: Finding[]): Decision {
  if (findings.length === 0) return { block: false };
  // Anti-loop guard: already continuing from a prior Stop block → let it stop.
  if (input.stop_hook_active === true) return { block: false };
  const lines = findings.map((f) => `  - ${f.file}:${f.line} ${f.message}`);
  const reason = [
    "SALP anchor/reference issues found in the repository (mechanical doc fix).",
    "Do NOT fix these yourself — it would derail your primary task. Dispatch a",
    "subagent (Task / Agent / subagent tool) to fix exactly the findings below;",
    "once it reports done, resume your primary task:",
    ...lines,
    "Fix recipe for the subagent: add the missing [ANC:ns:id], remove the stale",
    "[REF:ns:id], or correct the malformed token. (Examples inside fenced/inline",
    "code are already ignored.)",
  ].join("\n");
  return { block: true, reason };
}

/** True when a basename's extension is one we scan. */
function hasTextExtension(name: string): boolean {
  const dot = name.lastIndexOf(".");
  return dot > 0 && TEXT_EXTENSIONS.has(name.slice(dot));
}

/** Candidate predicate applied to git-listed (relative) paths: right
 *  extension, not an excluded surface (built-in or project `extra`), and not
 *  under an excluded dir. */
function isCandidatePath(path: string, extra: string[] = []): boolean {
  const segs = path.split("/");
  if (!hasTextExtension(segs[segs.length - 1])) return false;
  if (isSkippedPath(path, extra)) return false;
  for (const seg of segs) if (SKIP_DIRS.has(seg)) return false;
  return true;
}

/**
 * Ask git for the set of files it tracks-or-would-track under `root` — i.e.
 * all files EXCEPT those excluded by `.gitignore`, `.git/info/exclude`, and
 * the global excludes file. `--cached` = tracked, `--others` = untracked,
 * `--exclude-standard` = honor the standard ignore layers, `-z` = NUL-delimited
 * (binary-safe). Returns repo-root-relative paths, or null when `root` is not a
 * git work tree / git is unavailable (caller falls back to a manual walk).
 */
async function gitListedFiles(root: string): Promise<string[] | null> {
  try {
    const { code, stdout } = await new Deno.Command("git", {
      args: ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      cwd: root,
      stdout: "piped",
      stderr: "null",
    }).output();
    if (code !== 0) return null;
    return new TextDecoder().decode(stdout).split("\0").filter((p) =>
      p.length > 0
    );
  } catch {
    return null; // git binary absent or not permitted
  }
}

/**
 * Collect candidate text files under `root`. In a git work tree the file set
 * comes from `git ls-files` so `.gitignore`d paths are never scanned; outside
 * a repo it falls back to a manual recursive walk with the hard-coded denylist.
 */
export async function collectFiles(
  root: string,
  extraSkips: string[] = readSkipEnv(),
): Promise<Array<{ path: string; content: string }>> {
  const candidates: string[] = []; // full paths of scannable text files
  const ignoreFilePaths: string[] = []; // full paths of `.salpignore` files

  const listed = await gitListedFiles(root);
  if (listed) {
    for (const rel of listed) {
      const full = join(root, rel);
      if ((rel.split("/").pop() ?? "") === SALP_IGNORE_FILE) {
        ignoreFilePaths.push(full);
        continue;
      }
      if (!isCandidatePath(rel, extraSkips)) continue;
      candidates.push(full);
    }
  } else {
    // Non-git repo: manual walk pruning the denylisted dirs/surfaces.
    const walk = async (dir: string): Promise<void> => {
      for await (const entry of Deno.readDir(dir)) {
        const full = join(dir, entry.name);
        if (entry.isDirectory) {
          if (SKIP_DIRS.has(entry.name)) continue;
          if (isSkippedPath(full, extraSkips)) continue;
          await walk(full);
          continue;
        }
        if (!entry.isFile) continue;
        if (entry.name === SALP_IGNORE_FILE) {
          ignoreFilePaths.push(full);
          continue;
        }
        if (!hasTextExtension(entry.name)) continue;
        if (isSkippedPath(full, extraSkips)) continue;
        candidates.push(full);
      }
    };
    await walk(root);
  }

  const ignores = await loadSalpIgnores(ignoreFilePaths);
  const out: Array<{ path: string; content: string }> = [];
  for (const full of candidates) {
    if (isIgnoredBySalpIgnore(full, ignores)) continue;
    try {
      out.push({ path: full, content: await Deno.readTextFile(full) });
    } catch {
      // unreadable / deleted-but-listed — skip, fail-open
    }
  }
  return out;
}

if (import.meta.main) {
  try {
    const input = JSON.parse(
      await new Response(Deno.stdin.readable).text(),
    ) as StopHookInput;
    const root = input.cwd && input.cwd.length > 0 ? input.cwd : Deno.cwd();
    const files = await collectFiles(root);
    const decision = decide(input, findIssues(files));
    if (decision.block) {
      console.log(
        JSON.stringify({ decision: "block", reason: decision.reason }),
      );
    }
  } catch {
    // Fail-open: never disrupt the session on a hook error.
  }
  Deno.exit(0);
}
