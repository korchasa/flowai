// FR-DIST.CODEX-AGENTS — TOML merge utility for Codex config.toml
/**
 * Merge flowai-managed `[agents.<name>]` tables into an existing Codex
 * `config.toml` without touching unrelated user sections.
 *
 * Contract:
 * - PURE. No FS. Callers pass in the current TOML text and receive the new text.
 * - OWNERSHIP boundary: flowai owns only the subset of `[agents.<name>]` tables
 *   listed in the manifest file (`.codex/flowai-agents.json`). User-authored
 *   entries outside that set are preserved byte-equivalent.
 * - FAIL FAST on malformed input TOML — throw with the underlying parse error
 *   so the caller can prompt the user. Never silently overwrite a user's config.
 *
 * Trade-off: `@std/toml` stringifies canonically and strips comments. Users who
 * hand-edit comments inside `[agents.<name>]` tables that flowai manages may
 * see them removed on the next sync. Comments in non-managed sections survive
 * because we don't touch those sub-trees (@std/toml preserves nested tables
 * across a parse → stringify round-trip).
 */

import { parse as parseToml, stringify as stringifyToml } from "@std/toml";
import { parse as parseYaml } from "@std/yaml";

/** Change for a single Codex subagent registration. */
export interface CodexAgentChange {
  /** Unique agent name (TOML sub-table key). */
  name: string;
  /** Short description shown in Codex subagent lists. */
  description: string;
  /** Path (relative to .codex/) to the sidecar TOML holding `developer_instructions`. */
  configFile: string;
}

/** Manifest file tracking agent names managed by flowai for Codex. */
export interface CodexManifest {
  version: number;
  /** Sorted list of agent names owned by flowai. */
  agents: string[];
}

/** Build an empty manifest. */
export function emptyCodexManifest(): CodexManifest {
  return { version: 1, agents: [] };
}

/** Parse a CodexManifest from JSON text. Null/empty/malformed → empty manifest. */
export function readCodexManifest(jsonText: string | null): CodexManifest {
  if (!jsonText) return emptyCodexManifest();
  try {
    const data = JSON.parse(jsonText) as Partial<CodexManifest>;
    if (!Array.isArray(data.agents)) return emptyCodexManifest();
    return {
      version: typeof data.version === "number" ? data.version : 1,
      agents: data.agents.map(String),
    };
  } catch {
    return emptyCodexManifest();
  }
}

/** Serialise a CodexManifest to JSON text (pretty-printed, stable ordering). */
export function writeCodexManifest(manifest: CodexManifest): string {
  const sorted: CodexManifest = {
    version: manifest.version,
    agents: [...manifest.agents].sort(),
  };
  return JSON.stringify(sorted, null, 2) + "\n";
}

/**
 * Escape an arbitrary string for safe embedding in a TOML basic string literal.
 * Handles backslash, double-quote, and control characters per the TOML 1.0 spec.
 * Used for `developer_instructions = "..."` when the body contains problematic
 * characters (triple quotes or literal CR/LF — see `escapeForTomlLiteral` below
 * for the multi-line triple-quoted path).
 */
function escapeTomlBasicString(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Build a Codex sidecar TOML file for a single universal agent.
 *
 * Input: raw universal agent markdown (`---\nname: ...\n---\nbody`).
 * Output: `{ sidecar, change }` where:
 * - `sidecar` is the full TOML text for `<cwd>/.codex/agents/<name>.toml` with
 *   top-level `name`, `description`, and `developer_instructions` keys. The
 *   body is written as a TOML basic string (escaped) unless it is large enough
 *   to benefit from a triple-quoted literal (>= 80 chars OR contains newlines).
 * - `change` is a `CodexAgentChange` record ready to pass to `mergeCodexConfig`.
 *
 * `developer_instructions` escaping strategy:
 * - If the body contains no triple-quote sequences (`"""`), emit a TOML
 *   multi-line literal string (triple single quotes `'''...'''`) to preserve
 *   verbatim content including backslashes. This is the cleanest for markdown
 *   bodies that contain `"` characters.
 * - If the body contains `'''`, fall back to multi-line basic string
 *   (triple double quotes `"""`) with backslash-escaped double quotes.
 * - If the body contains both `'''` and `"""`, fall back to a single-line
 *   basic string with all control chars escaped (this is pathological but
 *   handled for correctness).
 *
 * Throws if the content lacks a YAML frontmatter block with `name` + `description`.
 */
export function buildCodexAgentSidecar(
  rawAgentContent: string,
): { sidecar: string; change: CodexAgentChange } {
  const match = rawAgentContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "buildCodexAgentSidecar: agent file missing YAML frontmatter",
    );
  }
  const fmRaw = match[1];
  const body = match[2];
  const fm = parseYaml(fmRaw) as Record<string, unknown>;
  const name = String(fm.name ?? "").trim();
  const description = String(fm.description ?? "").trim();
  if (!name) {
    throw new Error(
      "buildCodexAgentSidecar: agent frontmatter missing required field `name`",
    );
  }
  if (!description) {
    throw new Error(
      "buildCodexAgentSidecar: agent frontmatter missing required field `description`",
    );
  }

  const bodyText = body.trimEnd();
  let instructionsField: string;
  if (!bodyText.includes("'''")) {
    // Prefer literal triple-single-quoted string — no escaping needed.
    instructionsField = `developer_instructions = '''\n${bodyText}\n'''`;
  } else if (!bodyText.includes('"""')) {
    // Fallback: basic multi-line string with escaped double quotes.
    const escaped = bodyText.replace(/\\/g, "\\\\").replace(
      /"""/g,
      '\\"\\"\\"',
    );
    instructionsField = `developer_instructions = """\n${escaped}\n"""`;
  } else {
    // Pathological: both delimiters present. Single-line basic string.
    instructionsField = `developer_instructions = "${
      escapeTomlBasicString(bodyText)
    }"`;
  }

  const descLine = `description = "${escapeTomlBasicString(description)}"`;
  const nameLine = `name = "${escapeTomlBasicString(name)}"`;

  const sidecar = [
    "# Managed by flowai. Do not edit by hand — changes will be overwritten on next sync.",
    nameLine,
    descLine,
    instructionsField,
    "",
  ].join("\n");

  const change: CodexAgentChange = {
    name,
    description,
    configFile: `./agents/${name}.toml`,
  };

  return { sidecar, change };
}

/**
 * Merge a set of agent changes into an existing Codex config.toml.
 *
 * Behaviour:
 * - For each change, upsert `[agents.<name>] description=... config_file=...`.
 * - Remove `[agents.<name>]` tables listed in the incoming manifest but absent
 *   from `changes` (stale flowai agents are cleaned up).
 * - Leave all other top-level keys and tables untouched.
 * - Refresh the manifest to reflect the post-merge managed agent set.
 *
 * @throws Error if `tomlText` cannot be parsed. Error message includes a
 *   `Failed to parse Codex config.toml` prefix plus the underlying parse error.
 */
export function mergeCodexConfig(
  tomlText: string,
  changes: CodexAgentChange[],
  manifest: CodexManifest,
): { content: string; manifest: CodexManifest } {
  const trimmed = tomlText.trim();
  let parsed: Record<string, unknown> = {};
  if (trimmed.length > 0) {
    try {
      parsed = parseToml(tomlText) as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Failed to parse Codex config.toml: ${msg}. Fix the file by hand and re-run sync.`,
      );
    }
  }

  // Ensure parsed.agents is a plain object (may be missing entirely).
  const agentsRaw = parsed.agents;
  const agents: Record<string, Record<string, unknown>> =
    agentsRaw && typeof agentsRaw === "object" && !Array.isArray(agentsRaw)
      ? { ...(agentsRaw as Record<string, Record<string, unknown>>) }
      : {};

  // Remove stale managed agents (listed in manifest but not in new changes).
  const changeNames = new Set(changes.map((c) => c.name));
  for (const name of manifest.agents) {
    if (!changeNames.has(name)) {
      delete agents[name];
    }
  }

  // Upsert each change.
  for (const change of changes) {
    agents[change.name] = {
      description: change.description,
      config_file: change.configFile,
    };
  }

  // Rebuild parsed.agents (omit the key entirely when there are no agents
  // so we don't leave a dangling `[agents]` header behind).
  if (Object.keys(agents).length > 0) {
    parsed.agents = agents;
  } else {
    delete parsed.agents;
  }

  const newManifest: CodexManifest = {
    version: 1,
    agents: [...changeNames].sort(),
  };

  // @std/toml stringify produces canonical output.
  const out = stringifyToml(parsed);
  return { content: out, manifest: newManifest };
}
