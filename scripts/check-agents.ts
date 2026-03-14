/**
 * check-agents.ts — Validate universal agent frontmatter in framework/agents/*.md.
 *
 * Checks:
 * - AG-1.1: name — required string, kebab-case, ≤64 chars, matches filename
 * - AG-1.2: description — required string, ≤1024 chars
 * - AG-1.3: tools — if present, must be string
 * - AG-1.4: disallowedTools — if present, must be string
 * - AG-1.5: readonly — if present, must be boolean
 * - AG-1.6: mode — if present, must be string
 * - AG-1.7: opencode_tools — if present, must be object with boolean values
 * - AG-1.8: no unknown fields
 *
 * Exits with code 1 if any violation is found.
 */
import { parse } from "@std/yaml";
import { join } from "@std/path";

export type AgentError = {
  agent: string;
  criterion: string;
  message: string;
};

const NAME_PATTERN = /^[a-z0-9]([a-z0-9]*(-[a-z0-9]+)*)?$/;
const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;

const KNOWN_FIELDS = new Set([
  "name",
  "description",
  "tools",
  "disallowedTools",
  "readonly",
  "mode",
  "opencode_tools",
]);

/** Parse YAML frontmatter from agent file content. */
export function parseAgentFrontmatter(
  content: string,
): { raw: string; data: Record<string, unknown> } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const data = parse(raw) as Record<string, unknown>;
  return { raw, data };
}

/** Validate agent frontmatter fields. fileName is the stem (without .md). */
export function validateAgentFrontmatter(
  fileName: string,
  data: Record<string, unknown>,
): AgentError[] {
  const errors: AgentError[] = [];
  const name = data.name;
  const description = data.description;

  // AG-1.1: name
  if (typeof name !== "string" || name.length === 0) {
    errors.push({
      agent: fileName,
      criterion: "AG-1.1",
      message: "Missing or empty 'name' field",
    });
  } else {
    if (name !== fileName) {
      errors.push({
        agent: fileName,
        criterion: "AG-1.1",
        message: `Name '${name}' does not match filename '${fileName}'`,
      });
    }
    if (name.length > NAME_MAX_LENGTH) {
      errors.push({
        agent: fileName,
        criterion: "AG-1.1",
        message: `Name exceeds ${NAME_MAX_LENGTH} chars: ${name.length}`,
      });
    }
    if (!NAME_PATTERN.test(name)) {
      errors.push({
        agent: fileName,
        criterion: "AG-1.1",
        message:
          `Name '${name}' violates charset [a-z0-9-] or has leading/trailing/consecutive hyphens`,
      });
    }
  }

  // AG-1.2: description
  if (typeof description !== "string" || description.length === 0) {
    errors.push({
      agent: fileName,
      criterion: "AG-1.2",
      message: "Missing or empty 'description' field",
    });
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push({
      agent: fileName,
      criterion: "AG-1.2",
      message:
        `Description exceeds ${DESCRIPTION_MAX_LENGTH} chars: ${description.length}`,
    });
  }

  // AG-1.3: tools
  if ("tools" in data && typeof data.tools !== "string") {
    errors.push({
      agent: fileName,
      criterion: "AG-1.3",
      message: `'tools' must be a string, got ${typeof data.tools}`,
    });
  }

  // AG-1.4: disallowedTools
  if ("disallowedTools" in data && typeof data.disallowedTools !== "string") {
    errors.push({
      agent: fileName,
      criterion: "AG-1.4",
      message: `'disallowedTools' must be a string, got ${typeof data
        .disallowedTools}`,
    });
  }

  // AG-1.5: readonly
  if ("readonly" in data && typeof data.readonly !== "boolean") {
    errors.push({
      agent: fileName,
      criterion: "AG-1.5",
      message: `'readonly' must be a boolean, got ${typeof data.readonly}`,
    });
  }

  // AG-1.6: mode
  if ("mode" in data && typeof data.mode !== "string") {
    errors.push({
      agent: fileName,
      criterion: "AG-1.6",
      message: `'mode' must be a string, got ${typeof data.mode}`,
    });
  }

  // AG-1.7: opencode_tools
  if ("opencode_tools" in data) {
    const ot = data.opencode_tools;
    if (typeof ot !== "object" || ot === null || Array.isArray(ot)) {
      errors.push({
        agent: fileName,
        criterion: "AG-1.7",
        message: `'opencode_tools' must be an object, got ${typeof ot}`,
      });
    } else {
      for (
        const [key, val] of Object.entries(ot as Record<string, unknown>)
      ) {
        if (typeof val !== "boolean") {
          errors.push({
            agent: fileName,
            criterion: "AG-1.7",
            message:
              `'opencode_tools.${key}' must be boolean, got ${typeof val}`,
          });
        }
      }
    }
  }

  // AG-1.8: no unknown fields
  for (const key of Object.keys(data)) {
    if (!KNOWN_FIELDS.has(key)) {
      errors.push({
        agent: fileName,
        criterion: "AG-1.8",
        message: `Unknown frontmatter field '${key}'`,
      });
    }
  }

  return errors;
}

/** Validate a single agent file. */
export async function validateAgentFile(
  agentsDir: string,
  fileName: string,
): Promise<AgentError[]> {
  const stem = fileName.replace(/\.md$/, "");
  const filePath = join(agentsDir, fileName);

  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch {
    return [{
      agent: stem,
      criterion: "AG-1.0",
      message: `Cannot read file: ${filePath}`,
    }];
  }

  const fm = parseAgentFrontmatter(content);
  if (!fm) {
    return [{
      agent: stem,
      criterion: "AG-1.0",
      message: "Invalid or missing YAML frontmatter",
    }];
  }

  return validateAgentFrontmatter(stem, fm.data);
}

/** Validate all agent .md files in given directories. */
export async function validateAllAgents(
  agentsDirs: string[],
): Promise<AgentError[]> {
  const allErrors: AgentError[] = [];

  for (const dir of agentsDirs) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const errors = await validateAgentFile(dir, entry.name);
          allErrors.push(...errors);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn(`Warning: Agents directory '${dir}' not found.`);
      } else {
        throw error;
      }
    }
  }

  return allErrors;
}

if (import.meta.main) {
  console.log("Checking agents (frontmatter validation)...");

  const errors = await validateAllAgents(["framework/agents"]);

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.agent}: ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log("✅ All agents pass frontmatter validation.");
  }
}
