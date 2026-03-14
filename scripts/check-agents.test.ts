import { assertEquals } from "@std/assert";
import {
  type AgentError,
  parseAgentFrontmatter,
  validateAgentFrontmatter,
} from "./check-agents.ts";

// --- parseAgentFrontmatter ---

Deno.test("parseAgentFrontmatter: valid YAML extracts data", () => {
  const content = `---
name: test-agent
description: A test agent
---

Body text.
`;
  const result = parseAgentFrontmatter(content);
  assertEquals(result !== null, true);
  assertEquals(result!.data.name, "test-agent");
  assertEquals(result!.data.description, "A test agent");
});

Deno.test("parseAgentFrontmatter: missing frontmatter returns null", () => {
  const result = parseAgentFrontmatter("No frontmatter here");
  assertEquals(result, null);
});

// --- validateAgentFrontmatter ---

Deno.test("AG: valid full agent (all 7 fields) passes", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    tools: "Read, Grep, Glob, Bash",
    disallowedTools: "Write, Edit",
    readonly: true,
    mode: "subagent",
    opencode_tools: { write: false, edit: false },
  });
  assertEquals(errors.length, 0);
});

Deno.test("AG: valid minimal agent (name + description) passes", () => {
  const errors = validateAgentFrontmatter("minimal-agent", {
    name: "minimal-agent",
    description: "A minimal agent",
  });
  assertEquals(errors.length, 0);
});

Deno.test("AG: missing name is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    description: "A test agent",
  });
  assertHasMessage(errors, "Required");
});

Deno.test("AG: name does not match filename is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "wrong-name",
    description: "A test agent",
  });
  assertHasMessage(errors, "does not match");
});

Deno.test("AG: name with uppercase is error", () => {
  const errors = validateAgentFrontmatter("Test-Agent", {
    name: "Test-Agent",
    description: "A test agent",
  });
  assertHasMessage(errors, "leading/trailing/consecutive");
});

Deno.test("AG: name exceeding 64 chars is error", () => {
  const longName = "a".repeat(65);
  const errors = validateAgentFrontmatter(longName, {
    name: longName,
    description: "A test agent",
  });
  assertHasMessage(errors, "≤64");
});

Deno.test("AG: missing description is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
  });
  assertHasMessage(errors, "Required");
});

Deno.test("AG: description exceeding 1024 chars is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "x".repeat(1025),
  });
  assertHasMessage(errors, "≤1024");
});

Deno.test("AG: tools as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    tools: ["Read", "Grep"],
  });
  assertHasMessage(errors, "string");
});

Deno.test("AG: disallowedTools as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    disallowedTools: 42,
  });
  assertHasMessage(errors, "string");
});

Deno.test("AG: readonly as non-boolean is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    readonly: "yes",
  });
  assertHasMessage(errors, "boolean");
});

Deno.test("AG: mode as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    mode: 123,
  });
  assertHasMessage(errors, "string");
});

Deno.test("AG: opencode_tools as non-object is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    opencode_tools: "invalid",
  });
  assertHasMessage(errors, "object");
});

Deno.test("AG: opencode_tools with non-boolean values is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    opencode_tools: { write: "no" },
  });
  assertHasMessage(errors, "boolean");
});

Deno.test("AG: unknown field is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    unknown_field: "value",
  });
  assertHasMessage(errors, "Unrecognized key");
});

// --- Helpers ---

function assertHasMessage(errors: AgentError[], substring: string): void {
  const found = errors.some((e) => e.message.includes(substring));
  if (!found) {
    throw new Error(
      `Expected message containing '${substring}' in: ${
        JSON.stringify(errors)
      }`,
    );
  }
}
