/**
 * Validates that code FR-* comments reference existing SRS requirements.
 *
 * Single check direction: code must not reference FR-IDs absent from SRS.
 * Part of `deno task check` pipeline.
 */
import { join } from "@std/path";

/** A code reference to an FR-ID. */
export type OrphanedRef = {
  id: string;
  file: string;
  line: number;
};

/** Comment-line FR reference: `// FR-*` or `# FR-*` at line start (with optional leading whitespace). */
const CODE_REF_PATTERN =
  /^[ \t]*(?:\/\/|#)\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/;

/** SRS heading pattern: `### FR-*` or `#### FR-*` — these define FR-IDs. */
const SRS_HEADING_PATTERN =
  /^#{2,4}\s+(?:\*\*)?(?:- )?(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/;

/**
 * Extracts all FR-* IDs defined in the SRS (from headings and bold-prefixed criteria).
 * Only picks up FR-IDs that appear as heading-level definitions, not inline prose references.
 */
export function extractFrIdsFromSrs(srsContent: string): Set<string> {
  const ids = new Set<string>();
  for (const line of srsContent.split("\n")) {
    const trimmed = line.trimStart();
    // Headings: ### FR-DIST, #### FR-DIST.SYNC, etc.
    const headingMatch = trimmed.match(SRS_HEADING_PATTERN);
    if (headingMatch) {
      ids.add(headingMatch[1]);
      continue;
    }
    // Bold-prefixed criteria: - [x] **FR-INIT.STACK Stack detection**
    const criteriaMatch = trimmed.match(
      /^- \[.\]\s+\*\*(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/,
    );
    if (criteriaMatch) {
      ids.add(criteriaMatch[1]);
    }
  }
  return ids;
}

/**
 * Extracts FR-* references from code comment lines in a single file.
 */
export function extractFrIdsFromCode(
  filePath: string,
  content: string,
): OrphanedRef[] {
  const refs: OrphanedRef[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(CODE_REF_PATTERN);
    if (match) {
      refs.push({ id: match[1], file: filePath, line: i + 1 });
    }
  }
  return refs;
}

/**
 * Returns code refs whose FR-ID does not exist in the SRS set.
 */
export function findOrphanedRefs(
  srsIds: Set<string>,
  codeRefs: OrphanedRef[],
): OrphanedRef[] {
  return codeRefs.filter((ref) => !srsIds.has(ref.id));
}

/** File extensions to scan for FR-* comments. */
const SCAN_EXTENSIONS = new Set([".ts", ".js", ".yml", ".yaml", ".sh"]);

/** Directories to skip during scan. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".claude",
  ".cursor",
  ".opencode",
  "documents",
  ".git",
  "benchmarks",
]);

/**
 * Recursively collects FR-* references from code files.
 */
async function scanCodeRefs(rootDir: string): Promise<OrphanedRef[]> {
  const allRefs: OrphanedRef[] = [];

  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }
      if (!entry.isFile) continue;

      const ext = entry.name.includes(".")
        ? "." + entry.name.split(".").pop()!
        : "";
      if (!SCAN_EXTENSIONS.has(ext)) continue;

      const content = await Deno.readTextFile(fullPath);
      const relPath = fullPath.startsWith(rootDir + "/")
        ? fullPath.slice(rootDir.length + 1)
        : fullPath;
      allRefs.push(...extractFrIdsFromCode(relPath, content));
    }
  }

  await walk(rootDir);
  return allRefs;
}

if (import.meta.main) {
  console.log("Checking FR-* traceability (orphaned code references)...");

  const srsPath = "documents/requirements.md";
  const srsContent = await Deno.readTextFile(srsPath);
  const srsIds = extractFrIdsFromSrs(srsContent);

  const codeRefs = await scanCodeRefs(Deno.cwd());
  const orphaned = findOrphanedRefs(srsIds, codeRefs);

  if (orphaned.length > 0) {
    for (const o of orphaned) {
      console.error(`[traceability] ${o.file}:${o.line}: ${o.id} not in SRS`);
    }
    console.error(`\n${orphaned.length} orphaned FR-* reference(s).`);
    Deno.exit(1);
  } else {
    console.log(
      `All ${codeRefs.length} code FR-* references match SRS (${srsIds.size} IDs).`,
    );
  }
}
