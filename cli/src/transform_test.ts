import { assertEquals } from "@std/assert";
import { transformAgent } from "./transform.ts";

const UNIVERSAL_FULL = `---
name: test-agent
description: A test agent for unit testing
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
readonly: true
mode: subagent
opencode_tools:
  write: false
  edit: false
---

You are a test agent. Do test things.
`;

const UNIVERSAL_MINIMAL = `---
name: test-executor
description: A minimal agent with no restrictions
mode: subagent
---

You are a minimal agent.
`;

Deno.test("transformAgent - Claude: keeps name, description, tools, disallowedTools; drops readonly, mode, opencode_tools", () => {
  const result = transformAgent(UNIVERSAL_FULL, "claude");
  // Should contain Claude-relevant fields
  assertFrontmatterField(result, "name", "test-agent");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "tools", "Read, Grep, Glob, Bash");
  assertFrontmatterField(result, "disallowedTools", "Write, Edit");
  // Should NOT contain non-Claude fields
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "mode");
  assertNoFrontmatterField(result, "opencode_tools");
  // Body preserved
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - Cursor: keeps name, description, readonly; drops tools, disallowedTools, mode, opencode_tools", () => {
  const result = transformAgent(UNIVERSAL_FULL, "cursor");
  assertFrontmatterField(result, "name", "test-agent");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "readonly", "true");
  assertNoFrontmatterField(result, "tools");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "mode");
  assertNoFrontmatterField(result, "opencode_tools");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - OpenCode: keeps description, mode; renames opencode_tools to tools; drops name, tools(string), disallowedTools", () => {
  const result = transformAgent(UNIVERSAL_FULL, "opencode");
  assertNoFrontmatterField(result, "name");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "mode", "subagent");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "opencode_tools");
  // opencode_tools renamed to tools (as map)
  assertFrontmatterContains(result, "tools:");
  assertFrontmatterContains(result, "write: false");
  assertFrontmatterContains(result, "edit: false");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - minimal agent (no restrictions): Claude gets only name + description", () => {
  const result = transformAgent(UNIVERSAL_MINIMAL, "claude");
  assertFrontmatterField(result, "name", "test-executor");
  assertFrontmatterField(
    result,
    "description",
    "A minimal agent with no restrictions",
  );
  assertNoFrontmatterField(result, "tools");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "mode");
});

Deno.test("transformAgent - minimal agent: Cursor gets only name + description", () => {
  const result = transformAgent(UNIVERSAL_MINIMAL, "cursor");
  assertFrontmatterField(result, "name", "test-executor");
  assertFrontmatterField(
    result,
    "description",
    "A minimal agent with no restrictions",
  );
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "mode");
});

Deno.test("transformAgent - minimal agent: OpenCode gets description + mode, no name", () => {
  const result = transformAgent(UNIVERSAL_MINIMAL, "opencode");
  assertNoFrontmatterField(result, "name");
  assertFrontmatterField(
    result,
    "description",
    "A minimal agent with no restrictions",
  );
  assertFrontmatterField(result, "mode", "subagent");
});

Deno.test("transformAgent - body preserved unchanged across all IDEs", () => {
  const body = "You are a test agent. Do test things.";
  for (const ide of ["claude", "cursor", "opencode"]) {
    const result = transformAgent(UNIVERSAL_FULL, ide);
    assertBodyContains(result, body);
  }
});

Deno.test("transformAgent - unknown fields pass through for all IDEs", () => {
  const content = `---
name: agent-x
description: Agent with custom field
custom_field: some-value
mode: subagent
---

Body text.
`;
  for (const ide of ["claude", "cursor", "opencode"]) {
    const result = transformAgent(content, ide);
    assertFrontmatterField(result, "custom_field", "some-value");
    assertBodyContains(result, "Body text.");
  }
});

Deno.test("transformAgent - YAML edge case: multiline description with colons and quotes", () => {
  const content = `---
name: edge-agent
description: "An agent that handles: colons, 'quotes', and \\"escapes\\""
mode: subagent
---

Body.
`;
  const result = transformAgent(content, "claude");
  assertFrontmatterField(result, "name", "edge-agent");
  // Description should be preserved (exact format may vary due to YAML re-serialization)
  assertFrontmatterContains(result, "description:");
  assertBodyContains(result, "Body.");
});

// --- Helpers ---

/** Assert that frontmatter contains a field with expected value */
function assertFrontmatterField(
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
  // Strip quotes for comparison
  const actual = match[1].replace(/^["']|["']$/g, "").trim();
  assertEquals(actual, expected, `Field "${field}" value mismatch`);
}

/** Assert that frontmatter does NOT contain a field */
function assertNoFrontmatterField(content: string, field: string): void {
  const fm = extractFrontmatter(content);
  const regex = new RegExp(`^${field}:`, "m");
  if (regex.test(fm)) {
    throw new Error(`Field "${field}" should NOT be in frontmatter:\n${fm}`);
  }
}

/** Assert that frontmatter contains a substring */
function assertFrontmatterContains(content: string, substr: string): void {
  const fm = extractFrontmatter(content);
  if (!fm.includes(substr)) {
    throw new Error(`Frontmatter should contain "${substr}":\n${fm}`);
  }
}

/** Assert that body contains expected text */
function assertBodyContains(content: string, expected: string): void {
  const body = extractBody(content);
  if (!body.includes(expected)) {
    throw new Error(`Body should contain "${expected}":\n${body}`);
  }
}

/** Extract frontmatter string (between --- delimiters) */
function extractFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error("No frontmatter found");
  return match[1];
}

/** Extract body (after frontmatter) */
function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (!match) throw new Error("No body found");
  return match[1];
}
