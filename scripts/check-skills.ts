/**
 * Validates all skill directories against FR-UNIVERSAL.AGENTSKILLS and FR-UNIVERSAL.XIDE-PATHS (agentskills.io compliance).
 *
 * Checks:
 * - FR-UNIVERSAL.STRUCT: Directory structure (only SKILL.md + allowed subdirs)
 * - FR-UNIVERSAL.FRONTMATTER: Frontmatter (Zod schema validation via resource-types.ts)
 * - FR-UNIVERSAL.DISCLOSURE: Progressive disclosure (line/token limits)
 * - FR-UNIVERSAL.REFS: File references (no nested subdirs in allowed dirs)
 * - FR-UNIVERSAL.PLACEHOLDERS: No custom path placeholders (<this-skill-dir>)
 * - FR-UNIVERSAL.IDE-VARS: No IDE-specific path variables (${...SKILL_DIR})
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
 * FR-UNIVERSAL.STRUCT: Validates directory structure.
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
      criterion: "FR-UNIVERSAL.STRUCT",
      message: "Missing SKILL.md",
    });
  }

  for (const entry of entries) {
    if (entry.name === "SKILL.md") continue;
    if (entry.isDirectory && ALLOWED_SUBDIRS.has(entry.name)) continue;
    errors.push({
      skill: dirName,
      criterion: "FR-UNIVERSAL.STRUCT",
      message: `Non-standard entry at skill root: ${entry.name}`,
    });
  }

  return errors;
}

/**
 * FR-UNIVERSAL.FRONTMATTER: Validates frontmatter fields via Zod schema.
 */
export function validateSkillFrontmatter(
  dirName: string,
  frontmatter: Record<string, unknown>,
): SkillError[] {
  return validateFrontmatter(
    dirName,
    "FR-UNIVERSAL.FRONTMATTER",
    frontmatter,
    SkillFrontmatterSchema,
    dirName,
  ).map(toSkillError);
}

/**
 * FR-UNIVERSAL.DISCLOSURE: Validates progressive disclosure limits.
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
      criterion: "FR-UNIVERSAL.DISCLOSURE",
      message: `SKILL.md has ${lines} lines (limit: ${SKILL_MAX_LINES})`,
    });
  }
  if (tokens >= SKILL_MAX_TOKENS) {
    errors.push({
      skill: dirName,
      criterion: "FR-UNIVERSAL.DISCLOSURE",
      message:
        `SKILL.md has ~${tokens} tokens (limit: ${SKILL_MAX_TOKENS}, approximated as chars/4)`,
    });
  }
  if (catalogTokens >= FRONTMATTER_MAX_TOKENS) {
    errors.push({
      skill: dirName,
      criterion: "FR-UNIVERSAL.DISCLOSURE",
      message:
        `Catalog metadata (name+description) has ~${catalogTokens} tokens (limit: ${FRONTMATTER_MAX_TOKENS}, approximated as chars/4)`,
    });
  }

  return errors;
}

/** FR-UNIVERSAL.PLACEHOLDERS: Custom path placeholder pattern. */
const CUSTOM_PLACEHOLDER_PATTERN = /<this-skill-dir>/;
/** FR-UNIVERSAL.IDE-VARS: IDE-specific path variable pattern (e.g. ${CLAUDE_SKILL_DIR}, ${CURSOR_SKILL_DIR}). */
const IDE_PATH_VAR_PATTERN = /\$\{[A-Z_]*SKILL_DIR\}/;

/**
 * FR-UNIVERSAL.XIDE-PATHS: Validates cross-IDE script path resolution.
 * - FR-UNIVERSAL.PLACEHOLDERS: No custom placeholders like <this-skill-dir>
 * - FR-UNIVERSAL.IDE-VARS: No IDE-specific path variables like ${CLAUDE_SKILL_DIR}
 * (FR-UNIVERSAL.REL-PATHS relative paths are ensured implicitly by absence of placeholders/variables.)
 */
export function validatePathResolution(
  dirName: string,
  content: string,
): SkillError[] {
  const errors: SkillError[] = [];

  if (CUSTOM_PLACEHOLDER_PATTERN.test(content)) {
    errors.push({
      skill: dirName,
      criterion: "FR-UNIVERSAL.PLACEHOLDERS",
      message:
        "Uses <this-skill-dir> placeholder. Migrate to relative paths (e.g., scripts/validate.ts)",
    });
  }

  if (IDE_PATH_VAR_PATTERN.test(content)) {
    errors.push({
      skill: dirName,
      criterion: "FR-UNIVERSAL.IDE-VARS",
      message:
        "Uses IDE-specific path variable (${...SKILL_DIR}). Use relative paths instead",
    });
  }

  return errors;
}

/**
 * FR-UNIVERSAL.REFS: Validates file reference depth.
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
            criterion: "FR-UNIVERSAL.REFS",
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
 * Validates a single skill directory against all FR-UNIVERSAL.AGENTSKILLS criteria.
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

  // FR-UNIVERSAL.STRUCT: Structure
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
      criterion: "FR-UNIVERSAL.FRONTMATTER",
      message: "Invalid or missing YAML frontmatter",
    });
    return errors;
  }

  // FR-UNIVERSAL.FRONTMATTER: Frontmatter (Zod schema)
  errors.push(...validateSkillFrontmatter(dirName, fm.data));

  // FR-UNIVERSAL.DISCLOSURE: Progressive disclosure
  errors.push(...validateProgressiveDisclosure(dirName, content, fm.data));

  // FR-UNIVERSAL.XIDE-PATHS: Cross-IDE script path resolution
  errors.push(...validatePathResolution(dirName, content));

  // FR-UNIVERSAL.REFS: Reference depth
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
    "Checking skills (FR-UNIVERSAL.AGENTSKILLS, FR-UNIVERSAL.XIDE-PATHS agentskills.io compliance)...",
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
    console.log(
      "✅ All skills pass FR-UNIVERSAL.AGENTSKILLS, FR-UNIVERSAL.XIDE-PATHS compliance checks.",
    );
  }
}
