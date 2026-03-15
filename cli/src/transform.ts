/** Agent frontmatter transformation — extracts IDE-specific fields from universal format */
import { parse, stringify } from "@std/yaml";

/** Universal agent frontmatter schema (superset of all IDE-specific fields) */
export interface UniversalAgentFrontmatter {
  name: string;
  description: string;
  tools?: string;
  disallowedTools?: string;
  readonly?: boolean;
  mode?: string;
  opencode_tools?: Record<string, boolean>;
}

/** Fields each IDE keeps from the universal frontmatter. All other known fields are dropped. */
const IDE_FIELDS: Record<string, Set<string>> = {
  claude: new Set(["name", "description", "tools", "disallowedTools"]),
  cursor: new Set(["name", "description", "readonly"]),
  opencode: new Set(["description", "mode"]),
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
]);

/**
 * Transform universal agent content into IDE-specific format.
 * Parses YAML frontmatter, keeps only IDE-relevant fields,
 * passes through unknown fields, and preserves the body unchanged.
 */
export function transformAgent(content: string, ideName: string): string {
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

  const yamlOut = stringify(result, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlOut}\n---\n${body}`;
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
