import { join } from "@std/path";

const TEMPLATE_DIR = join(
  "framework",
  "core",
  "assets",
);

/**
 * Renders the unified AGENTS.md from the pack-level template with placeholder substitution.
 * All sections (project rules, documentation rules, development commands, planning rules,
 * TDD flow, diagnosing failures, code documentation) live in this single template.
 */
export async function renderAgentsMd(
  vars: Record<string, string>,
): Promise<string> {
  let content = await Deno.readTextFile(
    join(TEMPLATE_DIR, "AGENTS.template.md"),
  );
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value ?? "");
  }
  return content;
}
