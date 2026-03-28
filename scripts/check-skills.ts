/**
 * Validates all skill directories against FR-21.1 and FR-21.2 (agentskills.io compliance).
 *
 * Checks:
 * - FR-21.1.1: Directory structure (only SKILL.md + allowed subdirs)
 * - FR-21.1.2: Frontmatter (Zod schema validation via resource-types.ts)
 * - FR-21.1.3: Progressive disclosure (line/token limits)
 * - FR-21.1.4: File references (no nested subdirs in allowed dirs)
 * - FR-21.2.2: No custom path placeholders (<this-skill-dir>)
 * - FR-21.2.3: No IDE-specific path variables (${...SKILL_DIR})
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";
import {
  parseFrontmatter,
  type ResourceError,
  SkillFrontmatterSchema,
  validateFrontmatter,
} from "./resource-types.ts";

/** Re-export for backward compatibility with tests. */
export { parseFrontmatter } from "./resource-types.ts";

export type SkillError = {
  skill: string;
  criterion: string;
  message: string;
};

/** Convert ResourceError → SkillError. */
function toSkillError(e: ResourceError): SkillError {
  return { skill: e.resource, criterion: e.criterion, message: e.message };
}

/** Allowed entries at skill root besides SKILL.md. */
export const ALLOWED_SUBDIRS = new Set([
  "scripts",
  "references",
  "assets",
  "evals",
  "benchmarks",
]);

const SKILL_MAX_LINES = 500;
/** Token budget approximation: chars/4. Documented as adequate guardrail. */
const SKILL_MAX_TOKENS = 5000;
const FRONTMATTER_MAX_TOKENS = 100;

/**
 * FR-21.1.1: Validates directory structure.
 * Only SKILL.md and allowed subdirectories permitted at skill root.
 */
export function validateStructure(
  dirName: string,
  entries: { name: string; isDirectory: boolean; isFile: boolean }[],
): SkillError[] {
  const errors: SkillError[] = [];

  const hasSkillMd = entries.some((e) => e.isFile && e.name === "SKILL.md");
  if (!hasSkillMd) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.1",
      message: "Missing SKILL.md",
    });
  }

  for (const entry of entries) {
    if (entry.name === "SKILL.md") continue;
    if (entry.isDirectory && ALLOWED_SUBDIRS.has(entry.name)) continue;
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.1",
      message: `Non-standard entry at skill root: ${entry.name}`,
    });
  }

  return errors;
}

/**
 * FR-21.1.2: Validates frontmatter fields via Zod schema.
 */
export function validateSkillFrontmatter(
  dirName: string,
  frontmatter: Record<string, unknown>,
): SkillError[] {
  return validateFrontmatter(
    dirName,
    "FR-21.1.2",
    frontmatter,
    SkillFrontmatterSchema,
    dirName,
  ).map(toSkillError);
}

/**
 * FR-21.1.3: Validates progressive disclosure limits.
 * - SKILL.md: <500 lines, <5000 tokens (chars/4 approximation)
 * - Catalog metadata (name+description): <100 tokens per agentskills.io spec
 */
export function validateProgressiveDisclosure(
  dirName: string,
  content: string,
  frontmatter: Record<string, unknown>,
): SkillError[] {
  const errors: SkillError[] = [];
  const lines = content.split("\n").length;
  const tokens = Math.ceil(content.length / 4);

  // Catalog = name + description (what's loaded at session start)
  const name = typeof frontmatter.name === "string" ? frontmatter.name : "";
  const desc = typeof frontmatter.description === "string"
    ? frontmatter.description
    : "";
  const catalogTokens = Math.ceil((name.length + desc.length) / 4);

  if (lines >= SKILL_MAX_LINES) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.3",
      message: `SKILL.md has ${lines} lines (limit: ${SKILL_MAX_LINES})`,
    });
  }
  if (tokens >= SKILL_MAX_TOKENS) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.3",
      message:
        `SKILL.md has ~${tokens} tokens (limit: ${SKILL_MAX_TOKENS}, approximated as chars/4)`,
    });
  }
  if (catalogTokens >= FRONTMATTER_MAX_TOKENS) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.3",
      message:
        `Catalog metadata (name+description) has ~${catalogTokens} tokens (limit: ${FRONTMATTER_MAX_TOKENS}, approximated as chars/4)`,
    });
  }

  return errors;
}

/** FR-21.2.2: Custom path placeholder pattern. */
const CUSTOM_PLACEHOLDER_PATTERN = /<this-skill-dir>/;
/** FR-21.2.3: IDE-specific path variable pattern (e.g. ${CLAUDE_SKILL_DIR}, ${CURSOR_SKILL_DIR}). */
const IDE_PATH_VAR_PATTERN = /\$\{[A-Z_]*SKILL_DIR\}/;

/**
 * FR-21.2: Validates cross-IDE script path resolution.
 * - FR-21.2.2: No custom placeholders like <this-skill-dir>
 * - FR-21.2.3: No IDE-specific path variables like ${CLAUDE_SKILL_DIR}
 * (FR-21.2.1 relative paths are ensured implicitly by absence of placeholders/variables.)
 */
export function validatePathResolution(
  dirName: string,
  content: string,
): SkillError[] {
  const errors: SkillError[] = [];

  if (CUSTOM_PLACEHOLDER_PATTERN.test(content)) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.2.2",
      message:
        "Uses <this-skill-dir> placeholder. Migrate to relative paths (e.g., scripts/validate.ts)",
    });
  }

  if (IDE_PATH_VAR_PATTERN.test(content)) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.2.3",
      message:
        "Uses IDE-specific path variable (${...SKILL_DIR}). Use relative paths instead",
    });
  }

  return errors;
}

/**
 * FR-21.1.4: Validates file reference depth.
 * No subdirectories inside allowed dirs (one level deep only).
 */
export async function validateReferenceDepth(
  skillPath: string,
  dirName: string,
): Promise<SkillError[]> {
  const errors: SkillError[] = [];

  // benchmarks/ is excluded: scenarios naturally have nested dirs (fixture/, etc.)
  const depthCheckedDirs = [...ALLOWED_SUBDIRS].filter((d) =>
    d !== "benchmarks"
  );
  for (const subdir of depthCheckedDirs) {
    const subdirPath = join(skillPath, subdir);
    try {
      for await (const entry of Deno.readDir(subdirPath)) {
        if (entry.isDirectory) {
          errors.push({
            skill: dirName,
            criterion: "FR-21.1.4",
            message:
              `Nested directory '${entry.name}' inside ${subdir}/ (must be one level deep)`,
          });
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
      // Subdir doesn't exist — fine
    }
  }

  return errors;
}

/**
 * Validates a single skill directory against all FR-21.1 criteria.
 */
export async function validateSkill(
  skillsDir: string,
  dirName: string,
): Promise<SkillError[]> {
  const skillPath = join(skillsDir, dirName);
  const errors: SkillError[] = [];

  // Collect directory entries
  const entries: { name: string; isDirectory: boolean; isFile: boolean }[] = [];
  for await (const entry of Deno.readDir(skillPath)) {
    entries.push({
      name: entry.name,
      isDirectory: entry.isDirectory,
      isFile: entry.isFile,
    });
  }

  // FR-21.1.1: Structure
  errors.push(...validateStructure(dirName, entries));

  // Read SKILL.md
  const skillMdPath = join(skillPath, "SKILL.md");
  let content: string;
  try {
    content = await Deno.readTextFile(skillMdPath);
  } catch {
    return errors; // Already caught by validateStructure
  }

  // Parse frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.2",
      message: "Invalid or missing YAML frontmatter",
    });
    return errors;
  }

  // FR-21.1.2: Frontmatter (Zod schema)
  errors.push(...validateSkillFrontmatter(dirName, fm.data));

  // FR-21.1.3: Progressive disclosure
  errors.push(...validateProgressiveDisclosure(dirName, content, fm.data));

  // FR-21.2: Cross-IDE script path resolution
  errors.push(...validatePathResolution(dirName, content));

  // FR-21.1.4: Reference depth
  errors.push(...await validateReferenceDepth(skillPath, dirName));

  return errors;
}

/**
 * Validates all skills in the given directories.
 */
export async function validateAllSkills(
  skillsDirs: string[],
): Promise<SkillError[]> {
  const allErrors: SkillError[] = [];
  const seen = new Set<string>();

  for (const skillsDir of skillsDirs) {
    try {
      for await (const entry of Deno.readDir(skillsDir)) {
        if (entry.isDirectory && !seen.has(entry.name)) {
          seen.add(entry.name);
          const errors = await validateSkill(skillsDir, entry.name);
          allErrors.push(...errors);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn(`Warning: Skills directory '${skillsDir}' not found.`);
      } else {
        throw error;
      }
    }
  }

  return allErrors;
}

/** Discover all skills directories from pack structure */
async function discoverSkillsDirs(
  frameworkDir: string,
): Promise<string[]> {
  const dirs: string[] = [];
  try {
    for await (const pack of Deno.readDir(frameworkDir)) {
      if (!pack.isDirectory) continue;
      const skillsDir = join(frameworkDir, pack.name, "skills");
      try {
        const stat = await Deno.stat(skillsDir);
        if (stat.isDirectory) dirs.push(skillsDir);
      } catch { /* no skills/ in this pack */ }
    }
  } catch { /* framework dir not found */ }
  return dirs;
}

if (import.meta.main) {
  console.log(
    "Checking skills (FR-21.1, FR-21.2 agentskills.io compliance)...",
  );

  const packSkillsDirs = await discoverSkillsDirs("framework");
  const errors = await validateAllSkills([
    ...packSkillsDirs,
    ".claude/skills",
  ]);

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.skill}: ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log("✅ All skills pass FR-21.1, FR-21.2 compliance checks.");
  }
}
