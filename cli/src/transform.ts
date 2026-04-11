// FR-DIST.MAPPING — agent frontmatter transformation per IDE
/** Agent frontmatter transformation — extracts IDE-specific fields from universal format */
import { parse, stringify } from "@std/yaml";

/** Abstract model tiers — IDE-agnostic quality/cost intent */
export const MODEL_TIERS = ["max", "smart", "fast", "cheap"] as const;
export type ModelTier = typeof MODEL_TIERS[number];

/** Built-in defaults: tier → IDE-native model string */
export const DEFAULT_MODEL_MAPS: Record<string, Record<string, string>> = {
  claude: { max: "opus", smart: "sonnet", fast: "haiku", cheap: "haiku" },
  cursor: { max: "slow", smart: "slow", fast: "fast", cheap: "fast" },
  opencode: {}, // user must configure in .flowai.yaml
  // FR-DIST.MAPPING — Codex model map. Verified 2026-04-11 from
  // ~/.codex/models_cache.json in codex-cli 0.118.0.
  codex: {
    max: "gpt-5.4",
    smart: "gpt-5.3-codex",
    fast: "gpt-5.4-mini",
    cheap: "gpt-5.4-mini",
  },
};

/** Reverse maps for cross-IDE sync: IDE-native model → tier */
const REVERSE_MODEL_MAPS: Record<string, Record<string, string>> = {
  claude: { opus: "max", sonnet: "smart", haiku: "cheap" },
  cursor: { slow: "smart", fast: "fast" },
  opencode: {},
  codex: {
    "gpt-5.4": "max",
    "gpt-5.3-codex": "smart",
    "gpt-5.4-mini": "fast",
  },
};

/** Universal agent frontmatter schema (superset of all IDE-specific fields) */
export interface UniversalAgentFrontmatter {
  name: string;
  description: string;
  tools?: string;
  disallowedTools?: string;
  readonly?: boolean;
  mode?: string;
  opencode_tools?: Record<string, boolean>;
  model?: string;
  effort?: string;
  maxTurns?: number;
  background?: boolean;
  isolation?: string;
  color?: string;
}

/** Fields each IDE keeps from the universal frontmatter. All other known fields are dropped. */
const IDE_FIELDS: Record<string, Set<string>> = {
  claude: new Set([
    "name",
    "description",
    "tools",
    "disallowedTools",
    "model",
    "effort",
    "maxTurns",
    "background",
    "isolation",
    "color",
  ]),
  cursor: new Set(["name", "description", "readonly", "model"]),
  opencode: new Set(["description", "mode", "model", "color"]),
  // FR-DIST.CODEX-AGENTS — Codex only consumes name/description/model from
  // agent frontmatter during transform; the markdown body later becomes
  // `developer_instructions` in a TOML sidecar written by writer.ts.
  codex: new Set(["name", "description", "model"]),
};

/** All known universal fields (used to identify pass-through/unknown fields) */
const ALL_KNOWN_FIELDS = new Set([
  "name",
  "description",
  "tools",
  "disallowedTools",
  "readonly",
  "mode",
  "opencode_tools",
  "model",
  "effort",
  "maxTurns",
  "background",
  "isolation",
  "color",
]);

/**
 * Resolve a model tier to an IDE-specific model string.
 * Returns undefined if tier is "inherit" or absent, or if no mapping exists.
 */
export function resolveModelTier(
  tier: string | undefined,
  ideName: string,
  modelMap?: Record<string, string>,
): string | undefined {
  if (!tier || tier === "inherit") return undefined;
  const map = modelMap ?? DEFAULT_MODEL_MAPS[ideName] ?? {};
  return map[tier]; // undefined if tier unknown or unmapped
}

/**
 * Transform universal agent content into IDE-specific format.
 * Parses YAML frontmatter, keeps only IDE-relevant fields,
 * resolves model tiers, passes through unknown fields, and preserves the body unchanged.
 */
export function transformAgent(
  content: string,
  ideName: string,
  modelMap?: Record<string, string>,
): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const data = parse(frontmatter) as
    & UniversalAgentFrontmatter
    & Record<string, unknown>;
  const keep = IDE_FIELDS[ideName] ?? new Set(["name", "description"]);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "opencode_tools") {
      // OpenCode: rename opencode_tools → tools (map)
      if (ideName === "opencode") {
        result["tools"] = value;
      }
      // Other IDEs: drop
      continue;
    }

    if (key === "maxTurns") {
      // OpenCode: rename maxTurns → steps
      if (ideName === "opencode") {
        result["steps"] = value;
      } else if (keep.has(key)) {
        result[key] = value;
      }
      continue;
    }

    if (ALL_KNOWN_FIELDS.has(key)) {
      // Known field: keep only if IDE wants it
      if (keep.has(key)) {
        result[key] = value;
      }
    } else {
      // Unknown field: pass through for all IDEs
      result[key] = value;
    }
  }

  // Resolve model tier to IDE-specific value
  if (result.model !== undefined) {
    const resolved = resolveModelTier(
      result.model as string,
      ideName,
      modelMap,
    );
    if (resolved) {
      result.model = resolved;
    } else {
      // "inherit", absent mapping, or unknown tier → omit field
      delete result.model;
    }
  }

  const yamlOut = stringify(result, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlOut}\n---\n${body}`;
}

/**
 * Reverse-transform IDE-specific agent content into universal-ish format.
 * Inverse of transformAgent: restores IDE-specific fields back to universal names.
 * Unknown fields always pass through. Model values reverse-mapped to tiers (best-effort).
 */
export function reverseTransformAgent(
  content: string,
  sourceIde: string,
): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const data = parse(frontmatter) as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (
      sourceIde === "opencode" && key === "tools" &&
      typeof value === "object" && value !== null && !Array.isArray(value)
    ) {
      // opencode: tools (map) → opencode_tools (universal)
      result["opencode_tools"] = value;
    } else if (
      sourceIde === "opencode" && key === "steps" &&
      typeof value === "number"
    ) {
      // opencode: steps → maxTurns (universal)
      result["maxTurns"] = value;
    } else {
      result[key] = value;
    }
  }

  // Reverse model: IDE-specific → tier (best-effort, lossy for unknown values)
  if (result.model && typeof result.model === "string") {
    const reverseMap = REVERSE_MODEL_MAPS[sourceIde] ?? {};
    const tier = reverseMap[result.model as string];
    if (tier) {
      result.model = tier;
    }
    // else: keep as-is (unknown model ID — lossy, acceptable)
  }

  const yamlOut = stringify(result, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlOut}\n---\n${body}`;
}

/**
 * Transform agent content from source IDE format to target IDE format.
 * If same IDE, returns content unchanged.
 * Logs a warning when fields may be dropped during cross-IDE transformation.
 */
export function crossTransformAgent(
  content: string,
  sourceIde: string,
  targetIde: string,
  log?: (msg: string) => void,
  modelMap?: Record<string, string>,
): string {
  if (sourceIde === targetIde) return content;
  try {
    (log ?? console.log)(
      "Note: agent frontmatter fields unsupported by target IDE will be dropped",
    );
    return transformAgent(
      reverseTransformAgent(content, sourceIde),
      targetIde,
      modelMap,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    (log ?? console.log)(
      `Warning: failed to transform agent frontmatter, copying as-is: ${msg}`,
    );
    return content;
  }
}

/**
 * Transform model tier in a skill SKILL.md file to IDE-specific value.
 * Uses regex replacement to preserve original YAML formatting (multiline descriptions, etc.).
 * Returns content unchanged if no frontmatter or no model field.
 */
export function transformSkillModel(
  content: string,
  ideName: string,
  modelMap?: Record<string, string>,
): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return content;

  const frontmatter = fmMatch[1];
  const modelLineMatch = frontmatter.match(/^model:\s*(.+)$/m);
  if (!modelLineMatch) return content;

  const tier = modelLineMatch[1].trim();
  const resolved = resolveModelTier(tier, ideName, modelMap);

  if (resolved) {
    // Replace just the model line, preserving everything else
    const newFrontmatter = frontmatter.replace(
      /^model:\s*.+$/m,
      `model: ${resolved}`,
    );
    return content.replace(fmMatch[0], `---\n${newFrontmatter}\n---\n`);
  } else {
    // "inherit" or unmapped tier → remove model line entirely
    const newFrontmatter = frontmatter.replace(/^model:\s*.+\n?/m, "");
    return content.replace(fmMatch[0], `---\n${newFrontmatter}\n---\n`);
  }
}

/** Split content into frontmatter string and body (including leading newline) */
function splitFrontmatter(content: string): {
  frontmatter: string;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No YAML frontmatter found in agent file");
  }
  return { frontmatter: match[1], body: match[2] };
}
