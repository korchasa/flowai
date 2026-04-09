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

/** A task file reference to an FR-ID via `implements` frontmatter. */
export type TaskRef = {
  id: string;
  file: string;
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

/**
 * Extracts FR-IDs from `implements` YAML frontmatter in a task/epic file.
 * Frontmatter is delimited by `---` lines at the start of the file.
 */
export function extractImplementsFromTask(
  filePath: string,
  content: string,
): TaskRef[] {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return [];

  // Find closing ---
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return [];

  // Parse implements from frontmatter (simple YAML list parser)
  const refs: TaskRef[] = [];
  let inImplements = false;
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    if (
      /^implements:\s*$/.test(line) || /^implements:\s*\[\s*\]\s*$/.test(line)
    ) {
      inImplements = true;
      if (/\[\s*\]/.test(line)) {
        inImplements = false; // empty array
      }
      continue;
    }
    if (inImplements) {
      const match = line.match(
        /^\s+-\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/,
      );
      if (match) {
        refs.push({ id: match[1], file: filePath });
      } else if (/^\S/.test(line)) {
        // New top-level key — stop parsing implements
        inImplements = false;
      }
    }
  }
  return refs;
}

/**
 * Returns task refs whose FR-ID does not exist in the SRS set.
 */
export function validateTaskRefs(
  srsIds: Set<string>,
  taskRefs: TaskRef[],
): TaskRef[] {
  return taskRefs.filter((ref) => !srsIds.has(ref.id));
}

/**
 * Scans documents/tasks/ for task files and extracts implements references.
 */
async function scanTaskRefs(tasksDir: string): Promise<TaskRef[]> {
  const allRefs: TaskRef[] = [];
  try {
    for await (const entry of Deno.readDir(tasksDir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const fullPath = join(tasksDir, entry.name);
      const content = await Deno.readTextFile(fullPath);
      const relPath = `documents/tasks/${entry.name}`;
      allRefs.push(...extractImplementsFromTask(relPath, content));
    }
  } catch {
    // Directory doesn't exist or is empty — no task refs to validate
  }
  return allRefs;
}

if (import.meta.main) {
  console.log("Checking FR-* traceability (orphaned code references)...");

  const srsPath = "documents/requirements.md";
  const srsContent = await Deno.readTextFile(srsPath);
  const srsIds = extractFrIdsFromSrs(srsContent);

  const codeRefs = await scanCodeRefs(Deno.cwd());
  const orphaned = findOrphanedRefs(srsIds, codeRefs);

  let hasErrors = false;

  if (orphaned.length > 0) {
    for (const o of orphaned) {
      console.error(`[traceability] ${o.file}:${o.line}: ${o.id} not in SRS`);
    }
    console.error(`\n${orphaned.length} orphaned FR-* reference(s).`);
    hasErrors = true;
  } else {
    console.log(
      `All ${codeRefs.length} code FR-* references match SRS (${srsIds.size} IDs).`,
    );
  }

  // Reverse lookup: task files → SRS
  const tasksDir = join(Deno.cwd(), "documents", "tasks");
  const taskRefs = await scanTaskRefs(tasksDir);
  if (taskRefs.length > 0) {
    const invalidTaskRefs = validateTaskRefs(srsIds, taskRefs);
    if (invalidTaskRefs.length > 0) {
      for (const t of invalidTaskRefs) {
        console.error(
          `[traceability] ${t.file}: implements ${t.id} not in SRS`,
        );
      }
      console.error(
        `\n${invalidTaskRefs.length} invalid task implements reference(s).`,
      );
      hasErrors = true;
    } else {
      console.log(
        `All ${taskRefs.length} task implements references match SRS.`,
      );
    }
  }

  if (hasErrors) Deno.exit(1);
}
