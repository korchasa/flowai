/** Frontmatter / body assertion helpers shared by transform_test.ts and
 *  transform_reverse_test.ts. Not a `*_test.ts` file by design — Deno's test
 *  runner does not auto-execute it. */
import { assertEquals } from "@std/assert";

/** Assert that frontmatter contains a field with expected value */
export function assertFrontmatterField(
  content: string,
  field: string,
  expected: string,
): void {
  const fm = extractFrontmatter(content);
  const regex = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const match = fm.match(regex);
  if (!match) {
    throw new Error(`Field "${field}" not found in frontmatter:\n${fm}`);
  }
  const actual = match[1].replace(/^["']|["']$/g, "").trim();
  assertEquals(actual, expected, `Field "${field}" value mismatch`);
}

/** Assert that frontmatter does NOT contain a field */
export function assertNoFrontmatterField(content: string, field: string): void {
  const fm = extractFrontmatter(content);
  const regex = new RegExp(`^${field}:`, "m");
  if (regex.test(fm)) {
    throw new Error(`Field "${field}" should NOT be in frontmatter:\n${fm}`);
  }
}

/** Assert that frontmatter contains a substring */
export function assertFrontmatterContains(
  content: string,
  substr: string,
): void {
  const fm = extractFrontmatter(content);
  if (!fm.includes(substr)) {
    throw new Error(`Frontmatter should contain "${substr}":\n${fm}`);
  }
}

/** Assert that body contains expected text */
export function assertBodyContains(content: string, expected: string): void {
  const body = extractBody(content);
  if (!body.includes(expected)) {
    throw new Error(`Body should contain "${expected}":\n${body}`);
  }
}

/** Extract frontmatter string (between --- delimiters) */
export function extractFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error("No frontmatter found");
  return match[1];
}

/** Extract body (after frontmatter) */
export function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (!match) throw new Error("No body found");
  return match[1];
}
