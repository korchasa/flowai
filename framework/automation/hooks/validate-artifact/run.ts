#!/usr/bin/env -S deno run --allow-read

/**
 * validate-artifact hook: validates YAML frontmatter and required fields
 * in pipeline artifacts after each step.
 * PostToolUse hook — exit 0, stdout JSON with additionalContext on errors.
 */

/** Artifact schemas: filename pattern -> required frontmatter fields. */
const ARTIFACT_SCHEMAS: Record<string, string[]> = {
  "01-spec.md": ["issue", "scope"],
  "03-decision.md": ["variant", "tasks"],
  "05-qa-report.md": ["verdict", "high_confidence_issues"],
};

/** Check if a file is a pipeline artifact. */
export function getArtifactSchema(filePath: string): string[] | null {
  if (!filePath) return null;
  for (const [pattern, fields] of Object.entries(ARTIFACT_SCHEMAS)) {
    if (filePath.endsWith(pattern)) return fields;
  }
  return null;
}

/** Extract YAML frontmatter fields from markdown content. */
export function extractFrontmatterFields(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  const yaml = match[1];
  return yaml.split("\n")
    .map((line) => line.match(/^(\w[\w_-]*):/)?.[1])
    .filter((field): field is string => field !== undefined);
}

/** Validate artifact has required frontmatter fields. */
export function validateArtifact(
  content: string,
  requiredFields: string[],
): { valid: boolean; missing: string[] } {
  const fields = extractFrontmatterFields(content);
  const missing = requiredFields.filter((f) => !fields.includes(f));
  return { valid: missing.length === 0, missing };
}

// --- Entry point (stdin -> stdout) ---
if (import.meta.main) {
  const input = JSON.parse(await new Response(Deno.stdin.readable).text());
  const filePath: string = input?.tool_input?.file_path ??
    input?.tool_input?.file ?? "";
  const schema = getArtifactSchema(filePath);
  if (!schema) Deno.exit(0);

  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch {
    Deno.exit(0);
  }

  const result = validateArtifact(content, schema);
  if (!result.valid) {
    console.log(JSON.stringify({
      additionalContext:
        `[validate-artifact] Artifact ${filePath} is missing required YAML frontmatter fields: ${
          result.missing.join(", ")
        }. Fix the artifact before proceeding.`,
    }));
  }
}
