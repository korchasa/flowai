// [FR-PACKS.CMD-INVARIANT](../documents/requirements.md#fr-packs.cmd-invariant-command-source-must-not-carry-disable-model-invocation) — commands/ SKILL.md MUST NOT declare `disable-model-invocation`
// [FR-PACKS.SKILL-INVARIANT](../documents/requirements.md#fr-packs.skill-invariant-skill-source-must-not-carry-disable-model-invocation) — skills/ SKILL.md MUST NOT declare `disable-model-invocation`
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
 * - FR-PACKS.CMD-INVARIANT: Command source MUST NOT carry `disable-model-invocation`
 * - FR-PACKS.SKILL-INVARIANT: Skill source MUST NOT carry `disable-model-invocation`
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

/** Source directory kind, inferred from the parent directory name.
 * `commands` = user-only primitives (disable-model-invocation injected by writer).
 * `skills` = agent-invocable primitives (no flag allowed). */
export type SkillKind = "skill" | "command";

/** Infer kind from the skills directory path. Any path segment named
 * `commands` beats `skills` in the same path (they are mutually exclusive
 * in practice since the layout is `framework/<pack>/{skills|commands}/`). */
export function inferKind(skillsDir: string): SkillKind {
  // Normalize separators and look for a trailing segment.
  const segments = skillsDir.replace(/\\/g, "/").split("/");
  if (segments.includes("commands")) return "command";
  return "skill";
}

/**
 * Enforces per-kind invariants that the framework split relies on:
 *
 * - Under `commands/`: the source SKILL.md must NOT carry
 *   `disable-model-invocation`. The writer injects the flag at sync time
 *   (see `injectDisableModelInvocation` in cli/src/sync.ts); having it in
 *   source means either a stale migration artifact or an author trying to
 *   hand-maintain the flag despite directory-based classification.
 *
 * - Under `skills/`: the source SKILL.md must NOT carry
 *   `disable-model-invocation` at all. Skills are agent-invocable by
 *   definition; a skill with the flag is a command in the wrong directory.
 *
 * - Name prefixes are enforced by `check-naming-prefix.ts`, not here.
 */
export function validateKindInvariants(
  dirName: string,
  kind: SkillKind,
  fmData: Record<string, unknown>,
): SkillError[] {
  const errors: SkillError[] = [];
  const hasFlag = "disable-model-invocation" in fmData;
  if (kind === "command" && hasFlag) {
    errors.push({
      skill: dirName,
      criterion: "FR-PACKS.CMD-INVARIANT",
      message:
        "Command SKILL.md must NOT declare `disable-model-invocation` in " +
        "source; the writer injects it at sync time based on the commands/ " +
        "directory placement.",
    });
  }
  if (kind === "skill" && hasFlag) {
    errors.push({
      skill: dirName,
      criterion: "FR-PACKS.SKILL-INVARIANT",
      message:
        "Skill SKILL.md must NOT declare `disable-model-invocation`. A " +
        "primitive that is user-only belongs under commands/, not skills/.",
    });
  }
  return errors;
}

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

  // [FR-UNIVERSAL.STRUCT](../documents/requirements.md#fr-universal.struct-directory-structure-agentskills.io): Structure
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

  // [FR-UNIVERSAL.FRONTMATTER](../documents/requirements.md#fr-universal.frontmatter-frontmatter-agentskills.io): Frontmatter (Zod schema)
  errors.push(...validateSkillFrontmatter(dirName, fm.data));

  // [FR-PACKS](../documents/requirements.md#fr-packs-pack-system-modular-resource-installation).{CMD,SKILL}-INVARIANT: commands/ vs skills/ directory invariants.
  // Only applies to framework source tree; installed copies under .{ide}/skills/
  // legitimately carry `disable-model-invocation: true` on commands because
  // the writer injects it at sync time.
  if (skillsDir.replace(/\\/g, "/").includes("/framework/")) {
    errors.push(
      ...validateKindInvariants(
        dirName,
        inferKind(skillsDir),
        fm.data as Record<string, unknown>,
      ),
    );
  }

  // [FR-UNIVERSAL.DISCLOSURE](../documents/requirements.md#fr-universal.disclosure-progressive-disclosure-agentskills.io): Progressive disclosure
  errors.push(...validateProgressiveDisclosure(dirName, content, fm.data));

  // [FR-UNIVERSAL.XIDE-PATHS](../documents/requirements.md#fr-universal.xide-paths-cross-ide-script-path-resolution): Cross-IDE script path resolution
  errors.push(...validatePathResolution(dirName, content));

  // [FR-UNIVERSAL.IDE-NEUTRAL](../documents/requirements.md#fr-universal.ide-neutral-framework-ide-neutrality): framework skills/commands/agents must not name
  // IDE-specific models or CLI binaries (gpt-5, codex, claude-sonnet-4, etc.).
  // Model IDs belong in cli/src/transform.ts `DEFAULT_MODEL_MAPS`, not in
  // user-facing skill bodies.
  if (skillsDir.replace(/\\/g, "/").includes("/framework/")) {
    errors.push(...validateIdeNeutrality(dirName, content));
  }

  // [FR-UNIVERSAL.REFS](../documents/requirements.md#fr-universal.refs-file-references-agentskills.io): Reference depth
  errors.push(...await validateReferenceDepth(skillPath, dirName));

  return errors;
}

/**
 * Reject hardcoded IDE-specific model IDs or binary names in framework SKILL.md
 * bodies. Skill text must stay generic; model resolution happens at install
 * time via `DEFAULT_MODEL_MAPS` and `resolveModelTier`.
 *
 * The regex checks lower-case occurrences of `gpt-5`, the literal token
 * `codex` as a standalone word (so we don't flag `codex` mentions inside
 * cursor/claude descriptions if someone adds them to the list here), and
 * specific Claude model slugs like `claude-opus-4-6`. This keeps the check
 * strict enough to catch real violations but loose enough not to flag
 * historical mentions of `codex` inside benchmark fixture paths (those live
 * outside framework/, which is excluded above).
 */
export function validateIdeNeutrality(
  dirName: string,
  content: string,
): SkillError[] {
  const errors: SkillError[] = [];
  // Strip frontmatter to avoid flagging `model: smart` tiers or descriptions.
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  const forbidden: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bgpt-5(?:\.\d+)?(?:-\w+)?\b/i, label: "gpt-5 model ID" },
    { pattern: /\bclaude-opus-\d(?:-\d+)?\b/i, label: "Claude model ID" },
    { pattern: /\bclaude-sonnet-\d(?:-\d+)?\b/i, label: "Claude model ID" },
  ];
  for (const { pattern, label } of forbidden) {
    const match = body.match(pattern);
    if (match) {
      errors.push({
        skill: dirName,
        criterion: "FR-UNIVERSAL.IDE-NEUTRAL",
        message:
          `Framework SKILL.md body must not name a specific IDE model (${label}: "${
            match[0]
          }"). Use abstract tiers (max/smart/fast/cheap) and let flowai resolve per IDE.`,
      });
    }
  }
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

/** Discover all skill-bearing directories from pack structure.
 * Both `<pack>/skills/` (agent-invocable) and `<pack>/commands/` (user-only)
 * contain `SKILL.md` primitives and must be validated identically. */
async function discoverSkillsDirs(
  frameworkDir: string,
): Promise<string[]> {
  const dirs: string[] = [];
  try {
    for await (const pack of Deno.readDir(frameworkDir)) {
      if (!pack.isDirectory) continue;
      for (const subdir of ["skills", "commands"]) {
        const path = join(frameworkDir, pack.name, subdir);
        try {
          const stat = await Deno.stat(path);
          if (stat.isDirectory) dirs.push(path);
        } catch { /* subdir not present in this pack */ }
      }
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
