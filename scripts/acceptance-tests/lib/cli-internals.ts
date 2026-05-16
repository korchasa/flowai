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
// implements [FR-DIST.MAPPING](../../../documents/requirements.md#fr-dist.mapping-cross-ide-resource-mapping-universal-representation)
import { parse, stringify } from "@std/yaml";

/** Abstract model tiers — IDE-agnostic quality/cost intent. */
const DEFAULT_MODEL_MAPS: Record<string, Record<string, string>> = {
  claude: { max: "opus", smart: "sonnet", fast: "haiku", cheap: "haiku" },
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

function resolveModelTier(
  tier: string | undefined,
  ideName: string,
  modelMap?: Record<string, string>,
): string | undefined {
  if (!tier || tier === "inherit") return undefined;
  const map = modelMap ?? DEFAULT_MODEL_MAPS[ideName] ?? {};
  return map[tier];
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

  if (result.model !== undefined) {
    const resolved = resolveModelTier(
      result.model as string,
      ideName,
      modelMap,
    );
    if (resolved) {
      result.model = resolved;
    } else {
      delete result.model;
    }
  }

  const yamlOut = stringify(result, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlOut}\n---\n${body}`;
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
