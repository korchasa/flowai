// [REF:fr:packs.cmd-invariant | FR-PACKS.CMD-INVARIANT] — commands/ SKILL.md MUST NOT declare `disable-model-invocation`
// [REF:fr:packs.skill-invariant | FR-PACKS.SKILL-INVARIANT] — skills/ SKILL.md MUST NOT declare `disable-model-invocation`
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
import { walk } from "@std/fs";
import { join, relative } from "@std/path";
import { isComposite } from "./lib/composite-list.ts";
import {
  FRONTMATTER_MAX_TOKENS,
  SKILL_MAX_LINES,
  SKILL_MAX_TOKENS,
} from "./lib/skill-limits.ts";
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
  "acceptance-tests",
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
 * True if `skillsDir` points inside the framework source tree (the product),
 * as opposed to dev-only installs like `.claude/skills`. Framework-only checks
 * (kind invariants, IDE-neutrality, the FR-DESC-QUALITY WHEN-trigger gate)
 * gate on this.
 *
 * Matches a `framework` path segment whether the path is relative
 * (`framework/core/skills`, as `discoverSkillsDirs` emits) or absolute
 * (`/repo/framework/core/skills`). A plain `.includes("/framework/")` check
 * silently failed on the relative form, leaving every framework-only check
 * dormant in `deno task check`.
 */
export function isFrameworkSkillsDir(skillsDir: string): boolean {
  const normalized = skillsDir.replace(/\\/g, "/");
  return /(^|\/)framework\//.test(normalized);
}

/**
 * Enforces per-kind invariants that the framework split relies on:
 *
 * - Under `commands/`: the source SKILL.md must NOT carry
 *   `disable-model-invocation`. The writer injects the flag at sync time
 *   (see `injectDisableModelInvocation` in flowai-cli); having it in
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

// SKILL_MAX_LINES, SKILL_MAX_TOKENS, FRONTMATTER_MAX_TOKENS imported from
// ./lib/skill-limits.ts — single source of truth for skill size limits.
// Token budget approximation: chars/4. Documented as adequate guardrail.

/**
 * FR-DESC-QUALITY: phrases (case-insensitive substrings) that signal a
 * description states WHEN to invoke the skill, not just WHAT it does. This is
 * the single source of truth shared with engineer-skill's bundled
 * `validate_skill.ts` (kept in sync by hand; both reference the
 * engineer-skill WHAT+WHEN authoring rule).
 */
export const WHEN_TRIGGER_PHRASES: readonly string[] = [
  "use when",
  "use this",
  "use for",
  "use to",
  "use after",
  "use proactively",
  "use on",
  "triggers on",
  "used when",
  "should be used when",
  "when the user",
  "when you need",
];

/** True if the description contains any recognized WHEN-trigger phrase. */
export function descriptionHasWhenTrigger(description: string): boolean {
  const lower = description.toLowerCase();
  return WHEN_TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * FR-DESC-QUALITY: agent-invocable `skills/` must state WHEN to invoke them —
 * the description is the only signal the model classifier uses to discover the
 * skill. `commands/` are user-invoked (no auto-discovery) and exempt.
 *
 * Note: presence of a WHEN phrase is a deterministic floor, NOT a quality
 * guarantee — description quality stays reviewer-judged (see SDS §5).
 */
export function validateDescriptionWhenTrigger(
  dirName: string,
  kind: SkillKind,
  frontmatter: Record<string, unknown>,
): SkillError[] {
  if (kind !== "skill") return [];
  const desc = typeof frontmatter.description === "string"
    ? frontmatter.description
    : "";
  if (descriptionHasWhenTrigger(desc)) return [];
  return [{
    skill: dirName,
    criterion: "FR-DESC-QUALITY",
    message:
      'description missing a WHEN-trigger phrase (e.g. "Use when …"); a ' +
      "skills/ description must state when to invoke the skill, not just what " +
      "it does (see engineer-skill WHAT+WHEN rule).",
  }];
}

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
 * - SKILL.md: <700 lines, <5000 tokens (chars/4 approximation)
 * - Catalog metadata (name+description): <100 tokens per agentskills.io spec
 *
 * Composite-skill exemption (FR-SKILL-COMPOSE): skills listed in
 * `framework/composites.yaml` `composites:` (read via `lib/composite-list.ts`)
 * are exempt from the 5000-token cap. Their byte count is mechanically
 * dictated by the inlined atom sources (regenerated by
 * `scripts/generate-skill-composites.ts`), and the no-delegation canon
 * (machine-enforced by the generator's canon validator) forbids reducing the
 * volume by re-introducing Skill-tool delegation. The line cap (500) and the
 * frontmatter catalog cap (100 tokens) still apply — they cap authoring
 * cruft rather than mechanically-required content.
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
  if (tokens >= SKILL_MAX_TOKENS && !isComposite(dirName)) {
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
const DOC_SCHEMA_REPLACEMENT =
  "resolve role SRS/SDS/tasks/index from project instructions";

const FORBIDDEN_DOC_SCHEMA_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
}> = [
  {
    pattern: /\bdocuments\/requirements\.md\b/g,
    label: "documents/requirements.md",
  },
  { pattern: /\bdocuments\/design\.md\b/g, label: "documents/design.md" },
  { pattern: /\bdocuments\/tasks\//g, label: "documents/tasks/" },
  { pattern: /\bdocuments\/index\.md\b/g, label: "documents/index.md" },
  {
    pattern: /^#{1,6}\s*SRS Format\b.*$/gim,
    label: "SRS Format schema block",
  },
  {
    pattern: /^#{1,6}\s*SDS Format\b.*$/gim,
    label: "SDS Format schema block",
  },
  {
    pattern: /^#{1,6}\s*Tasks\s*\(.*$/gim,
    label: "Tasks schema block",
  },
  { pattern: /^#\s*SRS\s*$/gim, label: "# SRS schema block" },
  { pattern: /^#\s*SDS\s*$/gim, label: "# SDS schema block" },
  {
    pattern: /^##\s+3\.\s+Functional Reqs\b.*$/gim,
    label: "SRS functional requirements schema block",
  },
  {
    pattern: /^##\s+3\.\s+Components\b.*$/gim,
    label: "SDS components schema block",
  },
];

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

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function isDocumentationSchemaAllowedPath(resourcePath: string): boolean {
  const path = normalizePath(resourcePath);
  if (path.includes("/acceptance-tests/")) return true;
  return /^framework\/[^/]+\/assets\/(?:AGENTS|CLAUDE)[^/]*\.md$/.test(path);
}

function isDocumentationSchemaScannedPath(resourcePath: string): boolean {
  const path = normalizePath(resourcePath);
  if (path.includes("/acceptance-tests/")) return false;
  if (/^framework\/[^/]+\/(?:skills|commands|agents|hooks)\//.test(path)) {
    return true;
  }
  if (/^framework\/[^/]+\/pack\.yaml$/.test(path)) return true;
  if (/^framework\/atoms\//.test(path)) return true;
  if (/^framework\/composites\//.test(path)) return true;
  return false;
}

function stripPackYamlScaffoldDefaults(
  resourcePath: string,
  content: string,
): string {
  const path = normalizePath(resourcePath);
  if (!/^framework\/[^/]+\/pack\.yaml$/.test(path)) return content;

  let inScaffolds = false;
  return content.split("\n").map((line) => {
    if (/^scaffolds:\s*$/.test(line)) {
      inScaffolds = true;
      return line;
    }
    if (inScaffolds && /^\S/.test(line) && line.trim() !== "") {
      inScaffolds = false;
    }
    if (!inScaffolds) return line;
    return line.replace(
      /\bdocuments\/(?:requirements\.md|design\.md|tasks\/|index\.md)/g,
      "<scaffold-path>",
    );
  }).join("\n");
}

function stripTraceabilityCommentLinks(
  resourcePath: string,
  content: string,
): string {
  const path = normalizePath(resourcePath);
  if (!/\.(?:ts|js|mjs|cjs|sh|py|yaml|yml)$/.test(path)) return content;
  return content.split("\n").map((line) => {
    if (
      /^\s*(?:\/\/|#)\s*\[FR-[A-Z0-9.-]+\]\([^)]*documents\/(?:requirements|design)\.md#[^)]+\)/
        .test(
          line,
        )
    ) {
      return line.replace(
        /\bdocuments\/(?:requirements|design)\.md/g,
        "<traceability-link>",
      );
    }
    return line;
  }).join("\n");
}

/**
 * [REF:fr:universal.doc-schema | FR-UNIVERSAL.DOC-SCHEMA]:
 * distributed plugin primitives must not encode
 * project-specific documentation file paths or SRS/SDS/task schemas. They must
 * resolve semantic roles from the project instructions artifact instead.
 */
export function validateDocumentationSchemaIndirection(
  resourcePath: string,
  content: string,
): SkillError[] {
  if (isDocumentationSchemaAllowedPath(resourcePath)) return [];

  const errors: SkillError[] = [];
  const scannedContent = stripTraceabilityCommentLinks(
    resourcePath,
    stripPackYamlScaffoldDefaults(resourcePath, content),
  );
  for (const { pattern, label } of FORBIDDEN_DOC_SCHEMA_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(scannedContent);
    if (!match) continue;
    errors.push({
      skill: normalizePath(resourcePath),
      criterion: "FR-UNIVERSAL.DOC-SCHEMA",
      message: `Forbidden documentation schema reference matched "${
        match[0]
      }" (${label}); ${DOC_SCHEMA_REPLACEMENT}.`,
    });
  }
  return errors;
}

export async function collectDocumentationSchemaIndirectionErrors(
  frameworkDir: string,
): Promise<SkillError[]> {
  const errors: SkillError[] = [];
  for await (const entry of walk(frameworkDir, { includeDirs: false })) {
    const relPath = normalizePath(
      join("framework", relative(frameworkDir, entry.path)),
    );
    if (!isDocumentationSchemaAllowedPath(relPath)) {
      if (!isDocumentationSchemaScannedPath(relPath)) continue;
    }
    const content = await Deno.readTextFile(entry.path);
    errors.push(...validateDocumentationSchemaIndirection(relPath, content));
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

  // acceptance-tests/ is excluded: scenarios naturally have nested dirs (fixture/, etc.)
  const depthCheckedDirs = [...ALLOWED_SUBDIRS].filter((d) =>
    d !== "acceptance-tests"
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

  // [REF:fr:universal.struct | FR-UNIVERSAL.STRUCT]: Structure
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

  // [REF:fr:universal.frontmatter | FR-UNIVERSAL.FRONTMATTER]: Frontmatter (Zod schema)
  errors.push(...validateSkillFrontmatter(dirName, fm.data));

  // [REF:fr:packs | FR-PACKS].{CMD,SKILL}-INVARIANT: commands/ vs skills/ directory invariants.
  // Only applies to framework source tree; installed copies under .{ide}/skills/
  // legitimately carry `disable-model-invocation: true` on commands because
  // the writer injects it at sync time.
  if (isFrameworkSkillsDir(skillsDir)) {
    const kind = inferKind(skillsDir);
    errors.push(
      ...validateKindInvariants(
        dirName,
        kind,
        fm.data as Record<string, unknown>,
      ),
    );
    // [REF:fr:desc-quality | FR-DESC-QUALITY]: skills/ descriptions must carry
    // a WHEN-trigger phrase so the model classifier can discover them.
    errors.push(
      ...validateDescriptionWhenTrigger(
        dirName,
        kind,
        fm.data as Record<string, unknown>,
      ),
    );
  }

  // [REF:fr:universal.disclosure | FR-UNIVERSAL.DISCLOSURE]: Progressive disclosure
  errors.push(...validateProgressiveDisclosure(dirName, content, fm.data));

  // [REF:fr:universal.xide-paths | FR-UNIVERSAL.XIDE-PATHS]: Cross-IDE script path resolution
  errors.push(...validatePathResolution(dirName, content));

  // [REF:fr:universal.ide-neutral | FR-UNIVERSAL.IDE-NEUTRAL]: framework skills/commands/agents must not name
  // IDE-specific models or CLI binaries (gpt-5, codex, claude-sonnet-4, etc.).
  // Model IDs belong in the CLI's `DEFAULT_MODEL_MAPS` (in flowai-cli), not
  // in user-facing skill bodies.
  if (isFrameworkSkillsDir(skillsDir)) {
    errors.push(...validateIdeNeutrality(dirName, content));
  }

  // [REF:fr:universal.refs | FR-UNIVERSAL.REFS]: Reference depth
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
/**
 * Skills exempt from FR-UNIVERSAL.IDE-NEUTRAL. `ai-ide-runner` is a cross-IDE
 * relay/comparison skill whose body deliberately documents the mapping from
 * vendor labels to native provider model IDs (e.g. `anthropic/claude-sonnet-4.6`,
 * `openai/gpt-5.4`) — naming concrete models IS the skill's subject matter, so
 * abstracting them to tiers would destroy the example. See SDS §3.17.
 */
export const IDE_NEUTRAL_EXEMPT = new Set(["ai-ide-runner"]);

export function validateIdeNeutrality(
  dirName: string,
  content: string,
): SkillError[] {
  if (IDE_NEUTRAL_EXEMPT.has(dirName)) return [];
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
  errors.push(
    ...await collectDocumentationSchemaIndirectionErrors("framework"),
  );

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
