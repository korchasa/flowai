// Inlined mirror of two helpers from korchasa/flowai-cli@^0.13 needed by
// the acceptance-test harness to reproduce the same frontmatter
// transformation the published CLI applies during sync. Kept here so the
// monorepo has no compile-time dependency on the external CLI repo.
//
// If you change agent-transform behaviour, change it FIRST in
// flowai-cli/src/transform.ts (and resource_reader.ts), then mirror the
// edits here. Drift between the two will silently desynchronise the
// acceptance harness from the real CLI output.
//
// implements [REF:fr:dist.mapping | FR-DIST.MAPPING]
import { parse, stringify } from "@std/yaml";

/**
 * What a tier resolves to. `effort` is meaningful only where the IDE has such a
 * field (Claude today); elsewhere it is dropped by `IDE_FIELDS`.
 */
export interface ResolvedTier {
  model: string;
  effort?: string;
}

/**
 * A tier entry, as written in a default map or a user's `.flowai.yaml`.
 * A bare string sets the model only and keeps the built-in effort.
 */
export type ModelTierSpec = string | ResolvedTier;

/** Abstract model tiers — IDE-agnostic quality/cost intent. */
const DEFAULT_MODEL_MAPS: Record<string, Record<string, ModelTierSpec>> = {
  claude: {
    max: { model: "opus", effort: "max" },
    smart: { model: "opus", effort: "high" },
    fast: { model: "sonnet", effort: "medium" },
    cheap: { model: "sonnet", effort: "low" },
  },
  cursor: { max: "slow", smart: "slow", fast: "fast", cheap: "fast" },
  opencode: {},
  codex: {
    max: "gpt-5.4",
    smart: "gpt-5.3-codex",
    fast: "gpt-5.4-mini",
    cheap: "gpt-5.4-mini",
  },
};

/** Universal agent frontmatter schema. */
interface UniversalAgentFrontmatter {
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

/** Fields each IDE keeps from the universal frontmatter. */
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
  codex: new Set(["name", "description", "model"]),
};

/** All known universal fields (used to identify pass-through/unknown fields). */
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
 * Resolve a tier into the model + effort pair for one IDE.
 *
 * A user override written as a bare string sets the model only — the built-in
 * effort for that tier is kept, so `smart: opus-4` stays a high-effort tier.
 */
function resolveModelTier(
  tier: string | undefined,
  ideName: string,
  modelMap?: Record<string, ModelTierSpec>,
): ResolvedTier | undefined {
  if (!tier || tier === "inherit") return undefined;
  const defaults = DEFAULT_MODEL_MAPS[ideName] ?? {};
  const spec = (modelMap ?? defaults)[tier];
  if (spec === undefined) return undefined;
  if (typeof spec !== "string") return spec;
  const builtin = defaults[tier];
  const fallbackEffort = typeof builtin === "string"
    ? undefined
    : builtin?.effort;
  return fallbackEffort === undefined
    ? { model: spec }
    : { model: spec, effort: fallbackEffort };
}

function splitFrontmatter(
  content: string,
): { frontmatter: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No YAML frontmatter found in agent file");
  }
  return { frontmatter: match[1], body: match[2] };
}

/** Transform universal agent content into IDE-specific format. */
export function transformAgent(
  content: string,
  ideName: string,
  modelMap?: Record<string, ModelTierSpec>,
): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const data = parse(frontmatter) as
    & UniversalAgentFrontmatter
    & Record<string, unknown>;
  const keep = IDE_FIELDS[ideName] ?? new Set(["name", "description"]);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "opencode_tools") {
      if (ideName === "opencode") {
        result["tools"] = value;
      }
      continue;
    }
    if (key === "maxTurns") {
      if (ideName === "opencode") {
        result["steps"] = value;
      } else if (keep.has(key)) {
        result[key] = value;
      }
      continue;
    }
    if (ALL_KNOWN_FIELDS.has(key)) {
      if (keep.has(key)) {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  // [REF:fr:dist.mapping | FR-DIST.MAPPING]: a tier owns BOTH model and effort. A concrete model id is
  // not a tier, so it leaves any source-level `effort:` alone.
  if (typeof result.model === "string" && isTierName(result.model)) {
    const resolved = resolveModelTier(result.model, ideName, modelMap);
    if (resolved) {
      result.model = resolved.model;
      if (resolved.effort !== undefined && keep.has("effort")) {
        result.effort = resolved.effort;
      } else {
        delete result.effort;
      }
    } else {
      // `inherit` (or a tier this IDE does not map): inherit both halves.
      delete result.model;
      delete result.effort;
    }
  }

  const yamlOut = stringify(result, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlOut}\n---\n${body}`;
}

/** Abstract model tiers recognised in skill/command frontmatter. */
const ABSTRACT_MODEL_TIERS = new Set(["max", "smart", "fast", "cheap"]);

/** True for a tier name, including `inherit` (which resolves to "drop both"). */
function isTierName(value: string): boolean {
  return ABSTRACT_MODEL_TIERS.has(value) || value === "inherit";
}

/**
 * Resolve an abstract model tier in a SKILL.md `model:` frontmatter line into
 * the IDE-specific model + effort pair, mirroring `transformAgent`'s tier
 * handling for the skill/command path. Skills are copied verbatim by the
 * acceptance harness (no full frontmatter rewrite), so this does a surgical
 * edit on the leading frontmatter block:
 *   - `model: inherit`                      → both `model:` and `effort:` removed
 *   - `model: <tier>` (resolved)            → `model: <concrete>` + `effort: <tier effort>`
 *   - `model: <tier>` (no IDE mapping, e.g. opencode) → line removed
 *   - `model: <concrete>` (not a tier)      → left untouched, effort untouched
 *   - no `model:` line / no frontmatter     → content returned unchanged
 *
 * Without this, an abstract tier like `model: cheap` reaches the IDE CLI raw
 * and the agent crashes with `model 'cheap' not found` the moment the skill is
 * invoked. Mirror of the published flowai-cli skill-sync tier resolution.
 *
 * implements [REF:fr:dist.mapping | FR-DIST.MAPPING]
 */
export function resolveSkillModel(content: string, ideName: string): string {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return content;
  const fm = fmMatch[1];
  const eol = /\r\n/.test(content.slice(0, fmMatch[0].length)) ? "\r\n" : "\n";
  const lines = fm.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^[ \t]*model:[ \t]*\S/.test(l));
  if (idx === -1) return content;
  const valMatch = lines[idx].match(
    /^[ \t]*model:[ \t]*(["']?)([A-Za-z0-9._-]+)\1[ \t]*$/,
  );
  if (!valMatch) return content; // non-scalar / unexpected — leave untouched
  const tier = valMatch[2];
  if (!isTierName(tier)) {
    return content; // already a concrete model id — leave it and its effort alone
  }
  const resolved = resolveModelTier(tier, ideName); // undefined for inherit / no-map
  // The tier owns effort: replace an existing line, drop it when the tier
  // carries none, and never leave a stale one behind.
  const effortIdx = lines.findIndex((l) => /^[ \t]*effort:[ \t]*\S/.test(l));
  if (effortIdx !== -1) lines.splice(effortIdx, 1);
  const modelIdx = lines.findIndex((l) => /^[ \t]*model:[ \t]*\S/.test(l));
  if (resolved) {
    lines[modelIdx] = `model: ${resolved.model}`;
    if (resolved.effort !== undefined) {
      lines.splice(modelIdx + 1, 0, `effort: ${resolved.effort}`);
    }
  } else {
    lines.splice(modelIdx, 1); // inherit / unmapped — drop the line entirely
  }
  const newFm = lines.join(eol);
  return content.replace(fm, () => newFm);
}

/** Inject `disable-model-invocation: true` into the leading frontmatter. */
export function injectDisableModelInvocation(content: string): string {
  const head = content.slice(0, 200);
  const crlf = /\r\n/.test(head);
  const eol = crlf ? "\r\n" : "\n";

  const fmRe = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(fmRe);
  if (!match) {
    throw new Error(
      "injectDisableModelInvocation: content has no frontmatter block",
    );
  }

  const fmBody = match[1];
  if (/^\s*disable-model-invocation\s*:/m.test(fmBody)) {
    return content;
  }

  const newFmBody = fmBody + eol + "disable-model-invocation: true";
  const newFrontmatter = `---${eol}${newFmBody}${eol}---`;
  return content.replace(fmRe, newFrontmatter);
}
