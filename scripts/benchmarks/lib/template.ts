import { join } from "@std/path";

const TEMPLATE_DIR = join(
  "framework",
  "core",
  "assets",
);

/**
 * Renders root AGENTS.md from the flowai-init template with placeholder substitution.
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

/**
 * Renders documents/AGENTS.md from template (no placeholders).
 */
export async function renderDocumentsMd(): Promise<string> {
  return await Deno.readTextFile(
    join(TEMPLATE_DIR, "AGENTS.documents.template.md"),
  );
}

/**
 * Renders scripts/AGENTS.md from template with placeholder substitution.
 */
export async function renderScriptsMd(
  vars: Record<string, string>,
): Promise<string> {
  let content = await Deno.readTextFile(
    join(TEMPLATE_DIR, "AGENTS.scripts.template.md"),
  );
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value ?? "");
  }
  return content;
}
