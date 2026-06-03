/**
 * SALP validator.
 *
 * Walks markdown + code surfaces, parses SALP anchors and references via
 * `scripts/lib/salp.ts`, and reports four classes of findings:
 *
 *   1. `dead-ref`           — REF points at an ANC that does not exist.
 *   2. `duplicate-anchor`   — two ANCs share the same {ns,id}.
 *   3. `unlisted-namespace` — ns is outside the seed allowlist.
 *   4. `legacy-grammar`     — GFM-form FR link, wikilink, or bare `// FR-X`
 *                              comment survives in a target surface
 *                              (only reported with --enforce-no-legacy).
 *
 * Phase 1 of the SALP adoption ships this validator in permissive mode:
 * the legacy-grammar gate is OFF by default. Subsequent phases enable it
 * over migrated surfaces.
 *
 * Exit codes: 0 = no findings; 1 = one or more findings.
 *
 * See: `documents/requirements.md` `[ANC:fr:doc-anchors]`.
 */
import { join, relative } from "@std/path";
import {
  detectLegacyGrammars,
  parseAnchors,
  parseRefs,
  type SalpAnchor,
  SalpSyntaxError,
  validateNamespace,
} from "./lib/salp.ts";

export type FindingKind =
  | "dead-ref"
  | "duplicate-anchor"
  | "unlisted-namespace"
  | "legacy-grammar"
  | "syntax-error";

export type Finding = {
  kind: FindingKind;
  file: string;
  line: number;
  col: number;
  message: string;
};

export type CollectOptions = {
  rootDir: string;
  /** Path globs (relative to rootDir) OR individual file paths. Plain file
   *  paths are supported directly to keep tests simple; for the CLI entry
   *  point we expand a hard-coded glob list. */
  patterns: string[];
  /** When true, surviving legacy grammar (GFM-link / wikilink / bare-FR
   *  comment) is reported as a finding. */
  enforceNoLegacy: boolean;
};

const TEXT_EXTENSIONS = new Set([".md", ".ts", ".js", ".yaml", ".yml"]);
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "flowai-experiments",
  "dist",
]);
const SKIP_PATH_PATTERNS = [
  /\/acceptance-tests\/runs(?:\/|$)/,
  /\/acceptance-tests\/cache(?:\/|$)/,
  /\/fixture(?:\/|$)/,
  /\/migrate-to-salp\.fixtures(?:\/|$)/,
  // Test files contain intentional grammar fixtures (bad anchors,
  // duplicate IDs, salp-short examples). They are meta-tests of the
  // validator/parser, not source surfaces. The parser is exercised
  // against these directly by `deno test`; double-coverage in the
  // validator would only produce false positives.
  /_test\.ts$/,
];

/** Strip non-cross-reference contexts so the parser does not interpret
 *  grammar examples / template literals as real anchors:
 *   - markdown: blank fenced code blocks and inline backtick spans.
 *   - `.ts`/`.js` source: keep ONLY comment lines (`//` or block comment
 *     bodies); SALP tokens in source MUST appear inside doc comments.
 *  Line numbers are preserved by emitting a blank line for every stripped
 *  line. */
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
    // JSDoc / inline code in comments uses backticks too — strip them so
    // grammar templates wrapped in inline-code spans are not interpreted as
    // real anchors.
    if (keep) out.push(line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length)));
    else out.push("");
  }
  return out.join("\n");
}

/** Default glob roots for the CLI invocation. Kept narrow so the validator
 *  does not accidentally scan generated SKILL.md trees. */
export const DEFAULT_ROOTS: ReadonlyArray<string> = [
  "documents",
  "framework",
  "scripts",
  "README.md",
  "AGENTS.md",
];

/** Walk a single root path (file or dir) and yield text files. */
async function* walkFiles(
  abs: string,
): AsyncIterable<string> {
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(abs);
  } catch {
    return;
  }
  if (stat.isFile) {
    yield abs;
    return;
  }
  if (!stat.isDirectory) return;
  for await (const entry of Deno.readDir(abs)) {
    const child = join(abs, entry.name);
    if (entry.isDirectory) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_PATH_PATTERNS.some((re) => re.test(child))) continue;
      yield* walkFiles(child);
    } else if (entry.isFile) {
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0) continue;
      if (!TEXT_EXTENSIONS.has(entry.name.slice(dot))) continue;
      yield child;
    }
  }
}

/** Collect findings across the configured surfaces. Pure async — no process
 *  exit, no console output (callers handle reporting). */
export async function collectFindings(
  opts: CollectOptions,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const anchorMap = new Map<string, { file: string; line: number }>();

  const files: string[] = [];
  for (const pattern of opts.patterns) {
    const abs = join(opts.rootDir, pattern);
    for await (const f of walkFiles(abs)) files.push(f);
  }

  // First pass: collect anchors, detect duplicates and unlisted namespaces,
  // capture syntax errors.
  const allRefs: Array<
    {
      file: string;
      ref: { ns: string; id: string; pos: { line: number; col: number } };
    }
  > = [];
  for (const file of files) {
    if (SKIP_PATH_PATTERNS.some((re) => re.test(file))) continue;
    const rawContent = await Deno.readTextFile(file);
    const content = stripNonReferenceContext(file, rawContent);
    const rel = relative(opts.rootDir, file);

    let ancs: SalpAnchor[];
    try {
      ancs = parseAnchors(content);
    } catch (err) {
      if (err instanceof SalpSyntaxError) {
        findings.push({
          kind: "syntax-error",
          file: rel,
          line: err.pos.line,
          col: err.pos.col,
          message: err.message,
        });
        ancs = [];
      } else {
        throw err;
      }
    }

    for (const anc of ancs) {
      if (!validateNamespace(anc.ns)) {
        findings.push({
          kind: "unlisted-namespace",
          file: rel,
          line: anc.pos.line,
          col: anc.pos.col,
          message:
            `namespace "${anc.ns}" is not in the seed allowlist (anchor "${anc.ns}:${anc.id}")`,
        });
        continue;
      }
      const key = `${anc.ns}:${anc.id}`;
      const prev = anchorMap.get(key);
      if (prev) {
        findings.push({
          kind: "duplicate-anchor",
          file: rel,
          line: anc.pos.line,
          col: anc.pos.col,
          message:
            `duplicate anchor "${key}" — first defined in ${prev.file}:${prev.line}`,
        });
      } else {
        anchorMap.set(key, { file: rel, line: anc.pos.line });
      }
    }

    try {
      for (const ref of parseRefs(content)) {
        if (!validateNamespace(ref.ns)) {
          findings.push({
            kind: "unlisted-namespace",
            file: rel,
            line: ref.pos.line,
            col: ref.pos.col,
            message:
              `namespace "${ref.ns}" is not in the seed allowlist (ref "${ref.ns}:${ref.id}")`,
          });
          continue;
        }
        allRefs.push({ file: rel, ref });
      }
    } catch (err) {
      if (err instanceof SalpSyntaxError) {
        findings.push({
          kind: "syntax-error",
          file: rel,
          line: err.pos.line,
          col: err.pos.col,
          message: err.message,
        });
      } else {
        throw err;
      }
    }

    if (opts.enforceNoLegacy) {
      for (const hit of detectLegacyGrammars(rawContent)) {
        findings.push({
          kind: "legacy-grammar",
          file: rel,
          line: hit.pos.line,
          col: hit.pos.col,
          message: `surviving legacy grammar (${hit.kind}): ${hit.raw}`,
        });
      }
    }
  }

  // Second pass: resolve refs.
  for (const { file, ref } of allRefs) {
    const key = `${ref.ns}:${ref.id}`;
    if (!anchorMap.has(key)) {
      findings.push({
        kind: "dead-ref",
        file,
        line: ref.pos.line,
        col: ref.pos.col,
        message: `dead REF "${key}" — no matching ANC found`,
      });
    }
  }

  return findings;
}

function formatFinding(f: Finding): string {
  return `${f.file}:${f.line}:${f.col}  [${f.kind}]  ${f.message}`;
}

async function main(argv: string[]): Promise<number> {
  const enforceNoLegacy = argv.includes("--enforce-no-legacy");
  const customRoots = argv.filter((a) => !a.startsWith("--"));
  const patterns = customRoots.length > 0 ? customRoots : DEFAULT_ROOTS;
  const findings = await collectFindings({
    rootDir: Deno.cwd(),
    patterns: [...patterns],
    enforceNoLegacy,
  });
  if (findings.length === 0) return 0;
  for (const f of findings) console.error(formatFinding(f));
  console.error(`\ncheck-salp: ${findings.length} finding(s)`);
  return 1;
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
