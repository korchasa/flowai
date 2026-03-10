/**
 * Validates all skill directories against FR-21.1 (agentskills.io compliance).
 *
 * Checks:
 * - FR-21.1.1: Directory structure (only SKILL.md + allowed subdirs)
 * - FR-21.1.2: Frontmatter (name, description validation)
 * - FR-21.1.3: Progressive disclosure (line/token limits)
 * - FR-21.1.4: File references (no nested subdirs in allowed dirs)
 *
 * Exits with code 1 if any violation is found.
 */
import { parse } from "@std/yaml";
import { join } from "@std/path";

/** Allowed entries at skill root besides SKILL.md. */
export const ALLOWED_SUBDIRS = new Set([
  "scripts",
  "references",
  "assets",
  "evals",
]);

/** Valid name pattern: lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens. */
const NAME_PATTERN = /^[a-z0-9]([a-z0-9]*(-[a-z0-9]+)*)?$/;
const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const SKILL_MAX_LINES = 500;
/** Token budget approximation: chars/4. Documented as adequate guardrail. */
const SKILL_MAX_TOKENS = 5000;
const FRONTMATTER_MAX_TOKENS = 100;

export type SkillError = {
  skill: string;
  criterion: string;
  message: string;
};

/**
 * Parses SKILL.md frontmatter from file content.
 * Returns the raw YAML string and parsed object, or null if invalid.
 */
export function parseFrontmatter(
  content: string,
): { raw: string; data: Record<string, unknown> } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const data = parse(raw) as Record<string, unknown>;
  return { raw, data };
}

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
 * FR-21.1.2: Validates frontmatter fields.
 */
export function validateFrontmatter(
  dirName: string,
  frontmatter: Record<string, unknown>,
): SkillError[] {
  const errors: SkillError[] = [];
  const name = frontmatter.name;
  const description = frontmatter.description;

  // Required: name
  if (typeof name !== "string" || name.length === 0) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.2",
      message: "Missing or empty 'name' field",
    });
  } else {
    if (name !== dirName) {
      errors.push({
        skill: dirName,
        criterion: "FR-21.1.2",
        message: `Name '${name}' does not match directory '${dirName}'`,
      });
    }
    if (name.length > NAME_MAX_LENGTH) {
      errors.push({
        skill: dirName,
        criterion: "FR-21.1.2",
        message: `Name exceeds ${NAME_MAX_LENGTH} chars: ${name.length}`,
      });
    }
    if (!NAME_PATTERN.test(name)) {
      errors.push({
        skill: dirName,
        criterion: "FR-21.1.2",
        message:
          `Name '${name}' violates charset [a-z0-9-] or has leading/trailing/consecutive hyphens`,
      });
    }
  }

  // Required: description
  if (typeof description !== "string" || description.length === 0) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.2",
      message: "Missing or empty 'description' field",
    });
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push({
      skill: dirName,
      criterion: "FR-21.1.2",
      message:
        `Description exceeds ${DESCRIPTION_MAX_LENGTH} chars: ${description.length}`,
    });
  }

  return errors;
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

/**
 * FR-21.1.4: Validates file reference depth.
 * No subdirectories inside allowed dirs (one level deep only).
 */
export async function validateReferenceDepth(
  skillPath: string,
  dirName: string,
): Promise<SkillError[]> {
  const errors: SkillError[] = [];

  for (const subdir of ALLOWED_SUBDIRS) {
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

  // FR-21.1.2: Frontmatter
  errors.push(...validateFrontmatter(dirName, fm.data));

  // FR-21.1.3: Progressive disclosure
  errors.push(...validateProgressiveDisclosure(dirName, content, fm.data));

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

if (import.meta.main) {
  console.log("Checking skills (FR-21.1 agentskills.io compliance)...");

  const errors = await validateAllSkills([
    "framework/skills",
    ".dev/skills",
  ]);

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.skill}: ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log("✅ All skills pass FR-21.1 compliance checks.");
  }
}
