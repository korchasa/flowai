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

Deno.test("AG-1.1: missing name is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    description: "A test agent",
  });
  assertHasCriterion(errors, "AG-1.1");
});

Deno.test("AG-1.1: name does not match filename is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "wrong-name",
    description: "A test agent",
  });
  assertHasCriterion(errors, "AG-1.1");
});

Deno.test("AG-1.1: name with uppercase is error", () => {
  const errors = validateAgentFrontmatter("Test-Agent", {
    name: "Test-Agent",
    description: "A test agent",
  });
  assertHasCriterion(errors, "AG-1.1");
});

Deno.test("AG-1.1: name exceeding 64 chars is error", () => {
  const longName = "a".repeat(65);
  const errors = validateAgentFrontmatter(longName, {
    name: longName,
    description: "A test agent",
  });
  assertHasCriterion(errors, "AG-1.1");
});

Deno.test("AG-1.2: missing description is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
  });
  assertHasCriterion(errors, "AG-1.2");
});

Deno.test("AG-1.2: description exceeding 1024 chars is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "x".repeat(1025),
  });
  assertHasCriterion(errors, "AG-1.2");
});

Deno.test("AG-1.3: tools as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    tools: ["Read", "Grep"],
  });
  assertHasCriterion(errors, "AG-1.3");
});

Deno.test("AG-1.4: disallowedTools as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    disallowedTools: 42,
  });
  assertHasCriterion(errors, "AG-1.4");
});

Deno.test("AG-1.5: readonly as non-boolean is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    readonly: "yes",
  });
  assertHasCriterion(errors, "AG-1.5");
});

Deno.test("AG-1.6: mode as non-string is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    mode: 123,
  });
  assertHasCriterion(errors, "AG-1.6");
});

Deno.test("AG-1.7: opencode_tools as non-object is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    opencode_tools: "invalid",
  });
  assertHasCriterion(errors, "AG-1.7");
});

Deno.test("AG-1.7: opencode_tools with non-boolean values is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    opencode_tools: { write: "no" },
  });
  assertHasCriterion(errors, "AG-1.7");
});

Deno.test("AG-1.8: unknown field is error", () => {
  const errors = validateAgentFrontmatter("test-agent", {
    name: "test-agent",
    description: "A test agent",
    unknown_field: "value",
  });
  assertHasCriterion(errors, "AG-1.8");
});

// --- Helpers ---

function assertHasCriterion(errors: AgentError[], criterion: string): void {
  const found = errors.some((e) => e.criterion === criterion);
  if (!found) {
    throw new Error(
      `Expected criterion ${criterion} in errors: ${JSON.stringify(errors)}`,
    );
  }
}
