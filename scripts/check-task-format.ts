/**
 * Validates task files under documents/tasks/ for the new committed-tasks layout.
 *
 * New-shape rule (full validation):
 *   - Path: documents/tasks/<YYYY>/<MM>/<slug>.md
 *   - Frontmatter required keys: date (YYYY-MM-DD), status (to do | in progress | done).
 *   - Optional: implements (array of FR-IDs — present for FR-driven tasks; omitted
 *     for internal/maintenance tasks), tags (array), related_tasks (array).
 *   - Status must match derivation from `## Definition of Done` checkbox count:
 *       0 of N → "to do"; 1..N-1 of N → "in progress"; N of N → "done".
 *     No DoD section → warning, status untouched.
 *
 * Legacy rule (warn-only, coexistence with current flowai-plan output):
 *   - Path: documents/tasks/<slug>.md (including legacy <YYYY-MM-DD>-<slug>.md form).
 *   - Emits a deprecation warning; does not gate `deno task check`.
 *
 * Ignored: documents/tasks/README.md (project-level note, if present).
 *
 * Exits 1 on any error; exit 0 on warnings only.
 */
import { join, relative } from "@std/path";
import { parseFrontmatter } from "./resource-types.ts";

export type ValidationLevel = "error" | "warning";

export type TaskValidationError = {
  file: string;
  message: string;
  level: ValidationLevel;
};

export type TaskClassification = "new-shape" | "legacy" | "ignored";

const STATUS_VALUES = new Set(["to do", "in progress", "done"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FR_ID_RE = /^FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*$/;
const NEW_PATH_RE =
  /^documents\/tasks\/(\d{4})\/(\d{2})\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.md$/;

/** Classify a task file by its repo-relative path (forward slashes). */
export function classifyTaskPath(filePath: string): TaskClassification {
  if (filePath === "documents/tasks/README.md") return "ignored";
  if (NEW_PATH_RE.test(filePath)) return "new-shape";
  if (filePath.startsWith("documents/tasks/") && filePath.endsWith(".md")) {
    return "legacy";
  }
  return "ignored";
}

export type DoDDerivation = {
  /** "to do" | "in progress" | "done" — null if no DoD section/items. */
  derived: string | null;
  total: number;
  checked: number;
};

/**
 * Counts top-level checkbox items in `## Definition of Done` and derives status.
 * Top-level items = lines starting with `- [ ]` or `- [x]` at column 0
 * (no leading whitespace), so nested "Test:"/"Evidence:" sub-bullets don't count.
 */
export function deriveStatusFromDoD(content: string): DoDDerivation {
  const lines = content.split("\n");
  let inDoD = false;
  let total = 0;
  let checked = 0;
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (inDoD) break;
      if (/^## Definition of Done\s*$/.test(line)) inDoD = true;
      continue;
    }
    if (!inDoD) continue;
    const m = line.match(/^- \[([ xX])\]/);
    if (m) {
      total++;
      if (m[1].toLowerCase() === "x") checked++;
    }
  }
  if (total === 0) return { derived: null, total: 0, checked: 0 };
  if (checked === 0) return { derived: "to do", total, checked };
  if (checked === total) return { derived: "done", total, checked };
  return { derived: "in progress", total, checked };
}

/** Validate a new-shape task file (path already verified by classifyTaskPath). */
export function validateNewShapeTask(
  filePath: string,
  content: string,
): TaskValidationError[] {
  const errs: TaskValidationError[] = [];
  let parsed: ReturnType<typeof parseFrontmatter> = null;
  try {
    parsed = parseFrontmatter(content);
  } catch (e) {
    errs.push({
      file: filePath,
      message: `Frontmatter YAML parse failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
      level: "error",
    });
    return errs;
  }
  if (!parsed) {
    errs.push({
      file: filePath,
      message: "Missing YAML frontmatter (expected `---` block at top)",
      level: "error",
    });
    return errs;
  }
  const fm = parsed.data;

  // YAML may parse unquoted `2026-05-07` as a Date; accept both forms.
  const dateOk = typeof fm.date === "string"
    ? DATE_RE.test(fm.date)
    : fm.date instanceof Date && !isNaN(fm.date.getTime());
  if (!dateOk) {
    errs.push({
      file: filePath,
      message: `Frontmatter 'date' missing or not in YYYY-MM-DD format (got: ${
        JSON.stringify(fm.date)
      })`,
      level: "error",
    });
  }

  if (typeof fm.status !== "string" || !STATUS_VALUES.has(fm.status)) {
    errs.push({
      file: filePath,
      message:
        `Frontmatter 'status' must be one of: 'to do' | 'in progress' | 'done' (got: ${
          JSON.stringify(fm.status)
        })`,
      level: "error",
    });
  }

  if (fm.implements !== undefined) {
    if (!Array.isArray(fm.implements)) {
      errs.push({
        file: filePath,
        message:
          "Frontmatter 'implements' must be an array of FR-IDs (or omitted for internal tasks)",
        level: "error",
      });
    } else {
      for (const id of fm.implements) {
        if (typeof id !== "string" || !FR_ID_RE.test(id)) {
          errs.push({
            file: filePath,
            message: `Frontmatter 'implements' contains invalid FR-ID: ${
              JSON.stringify(id)
            }`,
            level: "error",
          });
        }
      }
    }
  }

  if (fm.tags !== undefined && !Array.isArray(fm.tags)) {
    errs.push({
      file: filePath,
      message: "Frontmatter 'tags' must be an array (or omitted)",
      level: "error",
    });
  }

  if (fm.related_tasks !== undefined && !Array.isArray(fm.related_tasks)) {
    errs.push({
      file: filePath,
      message: "Frontmatter 'related_tasks' must be an array (or omitted)",
      level: "error",
    });
  }

  const dod = deriveStatusFromDoD(content);
  if (dod.total === 0) {
    errs.push({
      file: filePath,
      message:
        "No '## Definition of Done' section with checkbox items found — status cannot be derived",
      level: "warning",
    });
  } else if (
    dod.derived !== null &&
    typeof fm.status === "string" &&
    fm.status !== dod.derived
  ) {
    errs.push({
      file: filePath,
      message:
        `Status mismatch: frontmatter says '${fm.status}', DoD checkboxes (${dod.checked}/${dod.total}) derive '${dod.derived}'`,
      level: "error",
    });
  }

  return errs;
}

export function validateLegacyTask(filePath: string): TaskValidationError[] {
  return [{
    file: filePath,
    message:
      "Legacy flat-path task — migrate to documents/tasks/<YYYY>/<MM>/<slug>.md and add new-shape frontmatter",
    level: "warning",
  }];
}

/** Walk documents/tasks/ recursively and validate every .md file. */
export async function scanTasks(
  tasksDir: string,
): Promise<TaskValidationError[]> {
  const errs: TaskValidationError[] = [];
  const root = Deno.cwd();
  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const relPath = relative(root, fullPath);
      const klass = classifyTaskPath(relPath);
      if (klass === "ignored") continue;
      const content = await Deno.readTextFile(fullPath);
      if (klass === "new-shape") {
        errs.push(...validateNewShapeTask(relPath, content));
      } else {
        errs.push(...validateLegacyTask(relPath));
      }
    }
  }
  try {
    await walk(tasksDir);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  return errs;
}

async function main(): Promise<void> {
  console.log("Checking documents/tasks/ format...");
  const errs = await scanTasks(join(Deno.cwd(), "documents", "tasks"));
  let errorCount = 0;
  let warnCount = 0;
  for (const e of errs) {
    const tag = e.level === "error" ? "ERROR" : "WARN";
    console.error(`[task-format] ${tag} ${e.file}: ${e.message}`);
    if (e.level === "error") errorCount++;
    else warnCount++;
  }
  if (errorCount > 0) {
    console.error(`\n${errorCount} error(s), ${warnCount} warning(s).`);
    Deno.exit(1);
  }
  console.log(
    `OK — ${errs.length === 0 ? "no issues" : `${warnCount} warning(s)`}.`,
  );
}

if (import.meta.main) {
  await main();
}
