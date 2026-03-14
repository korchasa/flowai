/**
 * Shared Zod schemas and validation for framework resources (skills, agents).
 *
 * Single source of truth for frontmatter structure. Both check-skills.ts
 * and check-agents.ts delegate to this module for schema-based validation.
 */
import { z } from "zod";
import { parse } from "@std/yaml";

// --- Shared constraints ---

export const NAME_MAX_LENGTH = 64;
export const DESCRIPTION_MAX_LENGTH = 1024;

/** Lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens. */
const nameField = z.string()
  .min(1, "must not be empty")
  .max(NAME_MAX_LENGTH, `must be ≤${NAME_MAX_LENGTH} chars`)
  .regex(
    /^[a-z0-9]([a-z0-9]*(-[a-z0-9]+)*)?$/,
    "must match [a-z0-9-], no leading/trailing/consecutive hyphens",
  );

const descriptionField = z.string()
  .min(1, "must not be empty")
  .max(DESCRIPTION_MAX_LENGTH, `must be ≤${DESCRIPTION_MAX_LENGTH} chars`);

// --- Skill schema ---

export const SkillFrontmatterSchema = z.object({
  name: nameField,
  description: descriptionField,
  "disable-model-invocation": z.boolean().optional(),
  license: z.string().optional(),
}).strict();

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

// --- Agent schema ---

export const AgentFrontmatterSchema = z.object({
  name: nameField,
  description: descriptionField,
  tools: z.string().optional(),
  disallowedTools: z.string().optional(),
  readonly: z.boolean().optional(),
  mode: z.string().optional(),
  opencode_tools: z.record(z.string(), z.boolean()).optional(),
}).strict();

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

// --- Parse ---

/**
 * Extracts YAML frontmatter from markdown content.
 * Returns raw YAML string and parsed object, or null if invalid/missing.
 */
export function parseFrontmatter(
  content: string,
): { raw: string; data: Record<string, unknown> } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const data = parse(raw) as Record<string, unknown>;
  return { raw, data };
}

// --- Validation result ---

export type ResourceError = {
  resource: string;
  criterion: string;
  message: string;
};

/**
 * Validates frontmatter data against a Zod schema.
 *
 * @param resource - Resource identifier (directory name or file stem)
 * @param criterion - Criterion code for errors (e.g. "FR-21.1.2", "AG-1")
 * @param data - Parsed frontmatter object
 * @param schema - Zod schema to validate against
 * @param nameMatchTarget - If provided, checks that `name` equals this value
 */
export function validateFrontmatter(
  resource: string,
  criterion: string,
  data: Record<string, unknown>,
  schema: z.ZodType,
  nameMatchTarget?: string,
): ResourceError[] {
  const errors: ResourceError[] = [];

  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      const prefix = path ? `'${path}': ` : "";
      errors.push({
        resource,
        criterion,
        message: `${prefix}${issue.message}`,
      });
    }
  }

  if (
    nameMatchTarget &&
    typeof data.name === "string" &&
    data.name.length > 0 &&
    data.name !== nameMatchTarget
  ) {
    errors.push({
      resource,
      criterion,
      message:
        `'name' value '${data.name}' does not match expected '${nameMatchTarget}'`,
    });
  }

  return errors;
}
