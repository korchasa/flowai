/**
 * check-agents.ts — Validate universal agent frontmatter in framework/agents/*.md.
 *
 * Uses AgentFrontmatterSchema from resource-types.ts (Zod-based validation).
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";
import {
  AgentFrontmatterSchema,
  parseFrontmatter,
  type ResourceError,
  validateFrontmatter,
} from "./resource-types.ts";

/** Re-export for backward compatibility with tests. */
export {
  AgentFrontmatterSchema,
  parseFrontmatter as parseAgentFrontmatter,
} from "./resource-types.ts";

export type AgentError = {
  agent: string;
  criterion: string;
  message: string;
};

/** Convert ResourceError → AgentError. */
function toAgentError(e: ResourceError): AgentError {
  return { agent: e.resource, criterion: e.criterion, message: e.message };
}

/** Validate agent frontmatter fields via Zod schema. fileName is the stem (without .md). */
export function validateAgentFrontmatter(
  fileName: string,
  data: Record<string, unknown>,
): AgentError[] {
  return validateFrontmatter(
    fileName,
    "AG-1",
    data,
    AgentFrontmatterSchema,
    fileName,
  ).map(toAgentError);
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

  const fm = parseFrontmatter(content);
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
