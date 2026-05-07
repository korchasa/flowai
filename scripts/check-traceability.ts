/**
 * Validates documentation traceability under the GFM-everywhere principle.
 *
 * Two checks:
 *   1. Every GFM link in a code comment must resolve — file exists and the
 *      anchor matches an actual heading in that file (auto-slug equality).
 *   2. Every `implements:` reference in a task-file frontmatter must point
 *      to an FR-ID defined in SRS.
 *
 * Plus a deprecation gate: legacy `// FR-<ID>` shortcuts are reported as
 * errors with a migration hint. Once Phase 1 of the GFM migration epic
 * lands, this gate keeps the repo from regressing.
 */
import { dirname, isAbsolute, join, relative, resolve } from "@std/path";

/** A GFM markdown link extracted from a code comment. */
export type CommentLink = {
  /** Visible link text, e.g. "FR-CMD-EXEC". */
  text: string;
  /** Relative or absolute path target as written. */
  path: string;
  /** Anchor portion (after the `#`), or empty if none. */
  anchor: string;
  /** Source file the link was found in. */
  file: string;
  /** 1-based line number. */
  line: number;
};

/** A task-file frontmatter `implements:` reference. */
export type TaskRef = { id: string; file: string };

/** A legacy `// FR-<ID>` shortcut that still needs migration. */
export type LegacyFrRef = { id: string; file: string; line: number };

/** A GFM link that failed to resolve (file or anchor missing). */
export type BrokenLink = CommentLink & { reason: string };

/** Recognises GFM markdown links: `[text](path#anchor)` or `[text](path)`. */
const GFM_LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Comment-prefix recognition (TS/JS `//` and YAML/shell/Python `#`). */
const COMMENT_PREFIX_PATTERN = /^[ \t]*(?:\/\/|#)[ \t]*/;

/** Legacy `// FR-<ID>` with no GFM link present on the same line. */
const LEGACY_FR_PATTERN =
  /^[ \t]*(?:\/\/|#)\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)\b/;

/** SRS heading lines that DEFINE FR-IDs (used for task-ref validation). */
const SRS_HEADING_PATTERN =
  /^#{2,4}\s+(?:\*\*)?(?:- )?(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/;

/** Compute GFM auto-slug from a heading's literal text. Mirrors GitHub's
 *  algorithm: lowercase, strip punctuation except hyphen/underscore/period,
 *  collapse whitespace runs to single hyphen, do NOT collapse consecutive
 *  hyphens (GFM keeps them). */
export function computeAutoSlug(headingText: string): string {
  return headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\-_.\s]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Parses all heading lines (`#` … `######`) from a markdown file and
 *  returns the set of computed auto-slugs. */
export function extractHeadingSlugs(content: string): Set<string> {
  const slugs = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of content.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!m) continue;
    const base = computeAutoSlug(m[1]);
    if (!base) continue;
    // GitHub disambiguates duplicate slugs by appending `-1`, `-2`, …
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
    if (count === 0) slugs.add(base);
  }
  return slugs;
}

/** Strip backtick-wrapped segments (markdown inline code) from a line so
 *  GFM-link extraction does not mistake `[text](path.md#anchor)` examples
 *  inside code-spans for real cross-references. */
function stripBacktickSpans(line: string): string {
  return line.replace(/`[^`]*`/g, "");
}

/** Extract every GFM link that appears inside a `//` or `#` comment line.
 *  Backtick-wrapped GFM-link-shaped examples are excluded (they are
 *  markdown code-spans, not real links). */
export function extractCommentLinks(
  filePath: string,
  content: string,
): CommentLink[] {
  const out: CommentLink[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!COMMENT_PREFIX_PATTERN.test(rawLine)) continue;
    const line = stripBacktickSpans(rawLine);
    for (const m of line.matchAll(GFM_LINK_PATTERN)) {
      const target = m[2];
      const hashIdx = target.indexOf("#");
      const path = hashIdx === -1 ? target : target.slice(0, hashIdx);
      const anchor = hashIdx === -1 ? "" : target.slice(hashIdx + 1);
      out.push({
        text: m[1],
        path,
        anchor,
        file: filePath,
        line: i + 1,
      });
    }
  }
  return out;
}

/** Detect legacy `// FR-<ID>` shortcuts that lack a GFM link on the same
 *  line. Returns one entry per offending line. */
export function detectLegacyFrComments(
  filePath: string,
  content: string,
): LegacyFrRef[] {
  const out: LegacyFrRef[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(LEGACY_FR_PATTERN);
    if (!m) continue;
    // If the same line carries a GFM link, it's a migrated reference — not
    // a legacy shortcut. The link-text may legitimately echo the FR-ID.
    if (GFM_LINK_PATTERN.test(line)) {
      // re-create regex iterator state by resetting (matchAll is fine, but
      // .test() retains lastIndex on /g regex — reset here).
      GFM_LINK_PATTERN.lastIndex = 0;
      continue;
    }
    out.push({ id: m[1], file: filePath, line: i + 1 });
  }
  return out;
}

/** SRS-side: extract every FR-ID defined by a heading. Used for task-ref
 *  validation (task frontmatter still uses raw FR-IDs). */
export function extractFrIdsFromSrs(srsContent: string): Set<string> {
  const ids = new Set<string>();
  for (const line of srsContent.split("\n")) {
    const headingMatch = line.trimStart().match(SRS_HEADING_PATTERN);
    if (headingMatch) ids.add(headingMatch[1]);
    const criteriaMatch = line.trimStart().match(
      /^- \[.\]\s+\*\*(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/,
    );
    if (criteriaMatch) ids.add(criteriaMatch[1]);
  }
  return ids;
}

/** Validate that a comment-link resolves: file exists, anchor present. */
export async function validateLink(
  link: CommentLink,
  rootDir: string,
): Promise<BrokenLink | null> {
  // Skip non-`.md` targets (could be relative paths to code, URLs, etc.).
  // Traceability only cares about doc cross-references.
  if (!link.path.endsWith(".md")) return null;
  // Skip URLs.
  if (/^[a-z]+:\/\//i.test(link.path)) return null;

  const sourceDir = isAbsolute(link.file)
    ? dirname(link.file)
    : dirname(join(rootDir, link.file));
  const targetAbs = isAbsolute(link.path)
    ? link.path
    : resolve(sourceDir, link.path);

  let targetText: string;
  try {
    targetText = await Deno.readTextFile(targetAbs);
  } catch {
    return { ...link, reason: `target file not found: ${link.path}` };
  }
  if (!link.anchor) return null;
  const slugs = extractHeadingSlugs(targetText);
  if (!slugs.has(link.anchor)) {
    return {
      ...link,
      reason: `anchor "#${link.anchor}" not present in ${link.path}`,
    };
  }
  return null;
}

/** Task-frontmatter `implements:` parser (simple YAML subset). */
export function extractImplementsFromTask(
  filePath: string,
  content: string,
): TaskRef[] {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return [];
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return [];
  const refs: TaskRef[] = [];
  let inImplements = false;
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    if (
      /^implements:\s*$/.test(line) || /^implements:\s*\[\s*\]\s*$/.test(line)
    ) {
      inImplements = !/\[\s*\]/.test(line);
      continue;
    }
    if (inImplements) {
      const match = line.match(
        /^\s+-\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/,
      );
      if (match) refs.push({ id: match[1], file: filePath });
      else if (/^\S/.test(line)) inImplements = false;
    }
  }
  return refs;
}

export function validateTaskRefs(
  srsIds: Set<string>,
  taskRefs: TaskRef[],
): TaskRef[] {
  return taskRefs.filter((ref) => !srsIds.has(ref.id));
}

const SCAN_EXTENSIONS = new Set([".ts", ".js", ".yml", ".yaml", ".sh"]);
/** Name-only skips: directory whose name matches is never traversed. */
const NAME_SKIP = new Set([
  "node_modules",
  ".claude",
  ".cursor",
  ".opencode",
  "documents",
  ".git",
]);
/** Path-context skips: skip when the absolute path matches any pattern.
 *  Differentiates framework benchmark-scenario folders (fixture data, not
 *  source) from the benchmark runtime library at `scripts/benchmarks/`. */
const PATH_SKIP = [
  /\/framework\/[^/]+\/(?:skills|commands|agents)\/[^/]+\/benchmarks(?:\/|$)/,
  /\/framework\/[^/]+\/benchmarks(?:\/|$)/,
  /\/benchmarks\/cache(?:\/|$)/,
  /\/benchmarks\/runs(?:\/|$)/,
];

function shouldSkipDir(fullPath: string, name: string): boolean {
  if (NAME_SKIP.has(name)) return true;
  return PATH_SKIP.some((re) => re.test(fullPath));
}

async function scanCodeFiles(
  rootDir: string,
): Promise<{ links: CommentLink[]; legacy: LegacyFrRef[] }> {
  const links: CommentLink[] = [];
  const legacy: LegacyFrRef[] = [];

  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        if (!shouldSkipDir(fullPath, entry.name)) await walk(fullPath);
        continue;
      }
      if (!entry.isFile) continue;
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0 || !SCAN_EXTENSIONS.has(entry.name.slice(dot))) continue;
      const content = await Deno.readTextFile(fullPath);
      const rel = fullPath.startsWith(rootDir + "/")
        ? fullPath.slice(rootDir.length + 1)
        : fullPath;
      links.push(...extractCommentLinks(rel, content));
      legacy.push(...detectLegacyFrComments(rel, content));
    }
  }
  await walk(rootDir);
  return { links, legacy };
}

async function scanTaskRefs(tasksDir: string): Promise<TaskRef[]> {
  const refs: TaskRef[] = [];
  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const content = await Deno.readTextFile(fullPath);
      const relPath = relative(Deno.cwd(), fullPath);
      refs.push(...extractImplementsFromTask(relPath, content));
    }
  }
  try {
    await walk(tasksDir);
  } catch {
    /* tasks dir may not exist */
  }
  return refs;
}

if (import.meta.main) {
  console.log("Checking documentation traceability (GFM-everywhere)...");
  const root = Deno.cwd();
  const srsContent = await Deno.readTextFile("documents/requirements.md");
  const srsIds = extractFrIdsFromSrs(srsContent);

  const { links, legacy } = await scanCodeFiles(root);

  let hasErrors = false;

  // 1. Legacy `// FR-<ID>` shortcuts — block.
  if (legacy.length > 0) {
    console.error(
      `\n${legacy.length} legacy \`// FR-<ID>\` shortcut(s) — migrate to GFM links:`,
    );
    for (const l of legacy) {
      console.error(
        `  ${l.file}:${l.line}: \`// ${l.id}\` → ` +
          `\`// implements [${l.id}](${
            relative(dirname(l.file), "documents/requirements.md")
          }#${l.id.toLowerCase()}-…)\``,
      );
    }
    hasErrors = true;
  }

  // 2. GFM links in code comments — validate resolution.
  const broken: BrokenLink[] = [];
  for (const link of links) {
    const result = await validateLink(link, root);
    if (result) broken.push(result);
  }
  if (broken.length > 0) {
    console.error(
      `\n${broken.length} broken doc link(s) in code comments:`,
    );
    for (const b of broken) {
      console.error(`  ${b.file}:${b.line}: ${b.reason}`);
    }
    hasErrors = true;
  }

  if (legacy.length === 0 && broken.length === 0) {
    console.log(
      `All ${links.length} comment doc-link(s) resolve. ` +
        `0 legacy \`// FR-<ID>\` shortcuts.`,
    );
  }

  // 3. Task-frontmatter `implements:` references — must be in SRS.
  const taskRefs = await scanTaskRefs(join(root, "documents", "tasks"));
  if (taskRefs.length > 0) {
    const invalid = validateTaskRefs(srsIds, taskRefs);
    if (invalid.length > 0) {
      console.error("");
      for (const t of invalid) {
        console.error(
          `[traceability] ${t.file}: implements ${t.id} not in SRS`,
        );
      }
      console.error(
        `\n${invalid.length} invalid task implements reference(s).`,
      );
      hasErrors = true;
    } else {
      console.log(
        `All ${taskRefs.length} task implements reference(s) match SRS.`,
      );
    }
  }

  if (hasErrors) Deno.exit(1);
}
