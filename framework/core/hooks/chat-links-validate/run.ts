#!/usr/bin/env -S deno run --allow-read --allow-run=git --allow-env=HOME

/**
 * chat-links-validate hook — turn-end (`Stop`) check of the file references in
 * the agent's final chat answer.
 * [REF:fr:chat-links.hook | FR-CHAT-LINKS.HOOK]
 *
 * The user reads the answer in a client that opens a Markdown link with one
 * click. A path is useful there only when it is a link whose target exists.
 * The hook reads `last_assistant_message`, extracts every token the answer
 * presents as a path — a Markdown link target or an inline code span — and
 * checks each against the disk, relative to the session `cwd`:
 *
 *   - broken-link  — a link whose target does not exist. Matches found deeper
 *                    in the tree are listed as a hint.
 *   - missing-link — an existing project path written in backticks instead of
 *                    a link.
 *   - baseless     — a backtick path that does not resolve from the root but
 *                    exists deeper in the tree; the full paths are listed.
 *
 * Out of scope on purpose: bare prose (a slash in a sentence is not a claim),
 * quoted regions (code fences, blockquotes, inline runs of 3+ backticks),
 * URLs, templates, arguments, image tags, tokens without an extension or a
 * trailing slash, and absolute paths outside the project unless they are
 * linked. A backtick path with no file anywhere stays legal: it is how an
 * address with no file behind it (a file still to be created, a server path)
 * is written.
 *
 * Findings go back to the agent as `decision: block`; the reason forbids
 * repeating the answer, because the first copy is already on screen.
 * Anti-loop: `stop_hook_active: true` exits silently. Fail-open: any internal
 * error exits 0 without blocking.
 *
 * Ported from the OpsBrain `chat-links` guardrail check (Go), minus its rule
 * for repository clones under `sources/`.
 */

import { isAbsolute, join, relative } from "jsr:@std/path";

export type Form = "link" | "code";

/** A token the answer presents as a path. */
export type Candidate = {
  form: Form;
  /** The whole link for `link`, the span content for `code`. */
  raw: string;
  /** Normalised path: no line suffix, no `#anchor`. */
  path: string;
};

export type FindingKind = "broken-link" | "missing-link" | "baseless";

export type Finding = Candidate & {
  kind: FindingKind;
  /** Tree entries whose path ends with `path` (sorted). */
  matches: string[];
};

export type StopHookInput = {
  stop_hook_active?: boolean;
  cwd?: string;
  last_assistant_message?: string;
};

export type Decision = { block: boolean; reason?: string };

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;
const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;
const INLINE_RUN_RE = /(`{3,})[^\n]*?(`{3,})/g;
const MD_LINK_RE = /\[([^\]\n]*)\]\(([^)\s]+)\)/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const LINE_SUFFIX_RE = /:\d+(?:-\d+)?(?::\d+)?$/;
const TEMPLATE_RE = /[<>{}$*]|\.\.\./;
const EXTENSION_RE = /\.[A-Za-z0-9]{1,8}$/;
const NON_PATH_PREFIXES = [
  "http://",
  "https://",
  "mailto:",
  "git@",
  "ssh://",
  "#",
];
const MAX_LISTED_MATCHES = 3;

/** Blank paired inline runs of 3+ backticks whose closer is at least as long as the opener. */
function blankInlineRuns(line: string): string {
  return line.replace(
    INLINE_RUN_RE,
    (m, open: string, close: string) =>
      close.length >= open.length ? " ".repeat(m.length) : m,
  );
}

/**
 * Blank every region that quotes rather than claims: fenced blocks (a fence
 * closes only on a run of the same character at least as long as the opener),
 * blockquote lines and paired inline runs of 3+ backticks.
 */
export function stripQuotedRegions(text: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of text.split("\n")) {
    const trimmed = line.trimStart();
    if (fence !== null) {
      const close = FENCE_CLOSE_RE.exec(trimmed);
      if (
        close && close[1][0] === fence[0] && close[1].length >= fence.length
      ) {
        fence = null;
      }
      out.push("");
      continue;
    }
    if (trimmed.startsWith(">")) {
      out.push("");
      continue;
    }
    const open = FENCE_OPEN_RE.exec(trimmed);
    if (open) {
      const run = open[1];
      const rest = trimmed.slice(run.length);
      // "```x``` text" is an inline run, not a fence opener.
      if (!(run[0] === "`" && rest.includes("`"))) {
        fence = run;
        out.push("");
        continue;
      }
    }
    out.push(blankInlineRuns(line));
  }
  return out.join("\n");
}

/** Reduce a token to a path, or null when the token is not a path claim. */
export function normalise(token: string): string | null {
  let t = token.trim();
  if (NON_PATH_PREFIXES.some((p) => t.startsWith(p))) return null;
  if (t.includes("=") || /\s/.test(t)) return null;
  if (TEMPLATE_RE.test(t)) return null;
  const hash = t.indexOf("#");
  if (hash >= 0) t = t.slice(0, hash);
  t = t.replace(LINE_SUFFIX_RE, "");
  if (t === "" || t.includes(":") || !t.includes("/")) return null;
  if (!t.endsWith("/") && !EXTENSION_RE.test(t)) return null;
  return t;
}

/** Every path the answer claims: link targets first, then code spans outside links. */
export function extractCandidates(text: string): Candidate[] {
  const stripped = stripQuotedRegions(text);
  const out: Candidate[] = [];
  for (const m of stripped.matchAll(MD_LINK_RE)) {
    const path = normalise(m[2]);
    if (path) out.push({ form: "link", raw: m[0], path });
  }
  const withoutLinks = stripped.replace(
    MD_LINK_RE,
    (m) => " ".repeat(m.length),
  );
  for (const m of withoutLinks.matchAll(INLINE_CODE_RE)) {
    const path = normalise(m[1]);
    if (path) out.push({ form: "code", raw: m[1], path });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tree index
// ---------------------------------------------------------------------------

async function gitFiles(root: string): Promise<string[] | null> {
  try {
    const out = await new Deno.Command("git", {
      args: [
        "-C",
        root,
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
      ],
      stdout: "piped",
      stderr: "null",
    }).output();
    if (!out.success) return null;
    return new TextDecoder().decode(out.stdout).split("\0").filter((f) =>
      f.length > 0
    );
  } catch {
    return null;
  }
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [""];
  while (stack.length > 0) {
    const rel = stack.pop()!;
    for await (const entry of Deno.readDir(join(root, rel))) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const child = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory) stack.push(child);
      else if (entry.isFile) out.push(child);
    }
  }
  return out.sort();
}

/**
 * Project files relative to `root`: `git ls-files` inside a work tree (honours
 * `.gitignore`), otherwise a walk that skips `.git` and `node_modules`.
 */
export async function listTreeFiles(root: string): Promise<string[]> {
  return (await gitFiles(root)) ?? (await walkFiles(root));
}

/** Files plus their ancestor directories (directories end with `/`). */
function treeEntries(files: string[]): string[] {
  const entries = new Set<string>();
  for (const file of files) {
    entries.add(file);
    const parts = file.split("/");
    for (let i = 1; i < parts.length; i++) {
      entries.add(parts.slice(0, i).join("/") + "/");
    }
  }
  return [...entries];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function exists(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Expand `~` and turn an absolute path inside `root` into a root-relative one. */
function resolveCandidate(
  path: string,
  root: string,
): { rel: string } | { outside: string } {
  let abs: string | null = null;
  if (path.startsWith("~/")) {
    abs = join(Deno.env.get("HOME") ?? "~", path.slice(2));
  } else if (isAbsolute(path)) abs = path;
  if (abs === null) return { rel: path };
  const rel = relative(root, abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return { outside: abs };
  }
  return { rel: path.endsWith("/") ? `${rel}/` : rel };
}

/** Check every claimed path in `text` against the tree rooted at `root`. */
export async function analyzeAnswer(
  text: string,
  root: string,
): Promise<Finding[]> {
  let entries: string[] | null = null;
  const lookup = async (path: string): Promise<string[]> => {
    entries ??= treeEntries(await listTreeFiles(root));
    return entries.filter((e) => e === path || e.endsWith(`/${path}`)).sort();
  };

  const findings: Finding[] = [];
  const reported = new Set<string>();
  const report = (
    c: Candidate,
    kind: FindingKind,
    path: string,
    matches: string[],
  ) => {
    if (reported.has(path)) return;
    reported.add(path);
    findings.push({ ...c, kind, path, matches });
  };

  for (const c of extractCandidates(text)) {
    const resolved = resolveCandidate(c.path, root);
    if ("outside" in resolved) {
      // A file outside the project is checked only when the answer links it.
      if (c.form === "link" && !exists(resolved.outside)) {
        report(c, "broken-link", c.path, []);
      }
      continue;
    }
    const path = resolved.rel;
    if (exists(join(root, path))) {
      if (c.form === "code") report(c, "missing-link", path, []);
      continue;
    }
    const matches = await lookup(path);
    if (c.form === "link") report(c, "broken-link", path, matches);
    else if (matches.length > 0) report(c, "baseless", path, matches);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

function listMatches(matches: string[]): string {
  const shown = matches.slice(0, MAX_LISTED_MATCHES).map((m) => `\`${m}\``)
    .join(", ");
  const extra = matches.length - MAX_LISTED_MATCHES;
  return extra > 0 ? `${shown} (and ${extra} more)` : shown;
}

function describe(f: Finding): string {
  switch (f.kind) {
    case "broken-link": {
      const lines = [
        `Broken link: ${f.raw}`,
        `   No file at ${f.path}.`,
        `   Link an existing file, or - if no file is there - write the address in backticks instead of a link: \`${f.path}\`.`,
      ];
      if (f.matches.length > 0) {
        lines.push(
          `   Found elsewhere in the tree: ${listMatches(f.matches)}.`,
        );
      }
      return lines.join("\n");
    }
    case "missing-link":
      return [
        `Existing file not linked: \`${f.raw}\``,
        `   Write it as a markdown link: [${f.path}](${f.path}).`,
      ].join("\n");
    case "baseless":
      return [
        `Path with no base: \`${f.raw}\``,
        `   It does not resolve from the project root. Found ${f.matches.length} place(s) in the tree: ${
          listMatches(f.matches)
        }.`,
        "   Give the full path from the project root and link it.",
      ].join("\n");
  }
}

const LINK_RULES = [
  "Link rules:",
  "- A file in this project: markdown link, target relative to the project root.",
  "- A file outside the project: markdown link, absolute path in the target.",
  "- Line number goes in the link TEXT, not the target: [run.ts:12](src/run.ts).",
  "- An address with no file behind it (a file you plan to create, a path on a server, a template): backticks, never a link.",
];

/** Block the stop with a short correction request, unless already in a forced follow-up. */
export function decide(input: StopHookInput, findings: Finding[]): Decision {
  if (input.stop_hook_active === true || findings.length === 0) {
    return { block: false };
  }
  const n = findings.length;
  const reason = [
    `BLOCKED by the chat-links-validate hook: your answer has ${n} file-path problem${
      n === 1 ? "" : "s"
    }. ` +
    "Do NOT repeat the answer - the user already sees it. " +
    "Reply with a short correction only: one line per problem, giving the fixed reference and nothing else.",
    "",
    ...findings.map((f, i) => `${i + 1}. ${describe(f)}`),
    "",
    ...LINK_RULES,
  ].join("\n");
  return { block: true, reason };
}

if (import.meta.main) {
  try {
    const input = JSON.parse(
      await new Response(Deno.stdin.readable).text(),
    ) as StopHookInput;
    const message = input.last_assistant_message ?? "";
    if (input.stop_hook_active !== true && message.length > 0) {
      const root = input.cwd && input.cwd.length > 0 ? input.cwd : Deno.cwd();
      const decision = decide(input, await analyzeAnswer(message, root));
      if (decision.block) {
        console.log(
          JSON.stringify({ decision: "block", reason: decision.reason }),
        );
      }
    }
  } catch {
    // Fail-open: never disrupt the session on a hook error.
  }
  Deno.exit(0);
}
