#!/usr/bin/env -S deno run --allow-read

/**
 * validate-agent-structure hook: validates that automation pack agents
 * contain required sections (Permissions, Output Schema).
 * PostToolUse hook — exit 0, stdout JSON with additionalContext on errors.
 */

/** Required sections for automation pack agents. */
const REQUIRED_SECTIONS = ["## Permissions", "## Output Schema"];

/** Check if a file is an automation pack agent. */
export function isAutomationAgent(filePath: string): boolean {
  if (!filePath) return false;
  return /framework\/automation\/agents\/agent-.*\.md$/.test(filePath) ||
    /\.claude\/agents\/agent-.*\.md$/.test(filePath);
}

/** Validate that agent content contains all required sections. */
export function validateSections(
  content: string,
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      missing.push(section);
    }
  }
  return { valid: missing.length === 0, missing };
}

// --- Entry point (stdin -> stdout) ---
if (import.meta.main) {
  const input = JSON.parse(await new Response(Deno.stdin.readable).text());
  const filePath: string = input?.tool_input?.file_path ??
    input?.tool_input?.file ?? "";
  if (!filePath || !isAutomationAgent(filePath)) Deno.exit(0);

  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch {
    // File doesn't exist yet or unreadable — skip validation
    Deno.exit(0);
  }

  const result = validateSections(content);
  if (!result.valid) {
    console.log(JSON.stringify({
      additionalContext:
        `[validate-agent-structure] Agent ${filePath} is missing required sections: ${
          result.missing.join(", ")
        }. All automation pack agents MUST include Permissions and Output Schema sections.`,
    }));
  }
}
