import { assertEquals } from "@std/assert";
import {
  extractFrontmatterFields,
  getArtifactSchema,
  validateArtifact,
} from "./run.ts";

Deno.test("getArtifactSchema: matches spec artifact", () => {
  const schema = getArtifactSchema(
    ".flow/runs/20260101T000000/specification/01-spec.md",
  );
  assertEquals(schema, ["scope"]);
});

Deno.test("getArtifactSchema: matches decision artifact", () => {
  const schema = getArtifactSchema(
    ".flow/runs/20260101T000000/decision/03-decision.md",
  );
  assertEquals(schema, ["variant", "tasks"]);
});

Deno.test("getArtifactSchema: matches qa report", () => {
  const schema = getArtifactSchema(
    ".flow/runs/20260101T000000/verify/iter-1/05-qa-report.md",
  );
  assertEquals(schema, ["verdict", "high_confidence_issues"]);
});

Deno.test("getArtifactSchema: returns null for non-artifacts", () => {
  assertEquals(getArtifactSchema("README.md"), null);
  assertEquals(getArtifactSchema("src/main.ts"), null);
  assertEquals(getArtifactSchema(""), null);
});

Deno.test("extractFrontmatterFields: extracts fields from YAML", () => {
  const content = `---
issue: 42
scope: sdlc
---
# Content`;
  assertEquals(extractFrontmatterFields(content), ["issue", "scope"]);
});

Deno.test("extractFrontmatterFields: handles nested fields", () => {
  const content = `---
variant: "Variant A"
tasks:
  - desc: "task 1"
---`;
  assertEquals(extractFrontmatterFields(content), ["variant", "tasks"]);
});

Deno.test("extractFrontmatterFields: returns empty for no frontmatter", () => {
  assertEquals(extractFrontmatterFields("# No frontmatter"), []);
});

Deno.test("validateArtifact: valid spec", () => {
  const content = `---
issue: 42
scope: sdlc
---
# Spec`;
  const result = validateArtifact(content, ["issue", "scope"]);
  assertEquals(result.valid, true);
  assertEquals(result.missing, []);
});

Deno.test("validateArtifact: missing field", () => {
  const content = `---
issue: 42
---
# Spec`;
  const result = validateArtifact(content, ["issue", "scope"]);
  assertEquals(result.valid, false);
  assertEquals(result.missing, ["scope"]);
});
