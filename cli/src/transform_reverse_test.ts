// Reverse + cross transform tests — split out of transform_test.ts so both
// halves stay under the 500-line threshold.
import { assertEquals } from "@std/assert";
import { crossTransformAgent, reverseTransformAgent } from "./transform.ts";
import {
  assertBodyContains,
  assertFrontmatterContains,
  assertFrontmatterField,
  assertNoFrontmatterField,
} from "./transform_assertions.ts";

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
model: smart
effort: low
maxTurns: 5
background: true
isolation: worktree
color: blue
---

You are a test agent. Do test things.
`;

// --- reverseTransformAgent ---

Deno.test("reverseTransformAgent - opencode: renames tools map → opencode_tools", () => {
  const opencode = `---
description: My agent
mode: subagent
tools:
  write: false
  read: true
---

Body.
`;
  const result = reverseTransformAgent(opencode, "opencode");
  assertFrontmatterContains(result, "opencode_tools:");
  assertNoFrontmatterField(result, "tools");
  assertFrontmatterField(result, "mode", "subagent");
  assertBodyContains(result, "Body.");
});

Deno.test("reverseTransformAgent - opencode: tools string (not map) passes through unchanged", () => {
  const opencode = `---
description: My agent
tools: Read,Grep
---

Body.
`;
  const result = reverseTransformAgent(opencode, "opencode");
  assertFrontmatterField(result, "tools", "Read,Grep");
  assertNoFrontmatterField(result, "opencode_tools");
});

Deno.test("reverseTransformAgent - claude: model opus → tier max", () => {
  const claude = `---
name: my-agent
description: My agent
model: opus
---

Body.
`;
  const result = reverseTransformAgent(claude, "claude");
  assertFrontmatterField(result, "model", "max");
});

Deno.test("reverseTransformAgent - claude: model sonnet → tier smart", () => {
  const claude = `---
name: my-agent
description: My agent
model: sonnet
---

Body.
`;
  const result = reverseTransformAgent(claude, "claude");
  assertFrontmatterField(result, "model", "smart");
});

Deno.test("reverseTransformAgent - cursor: model slow → tier smart", () => {
  const cursor = `---
name: my-agent
description: My agent
model: slow
---

Body.
`;
  const result = reverseTransformAgent(cursor, "cursor");
  assertFrontmatterField(result, "model", "smart");
});

Deno.test("reverseTransformAgent - opencode: steps (number) → maxTurns", () => {
  const opencode = `---
description: My agent
mode: subagent
steps: 10
---

Body.
`;
  const result = reverseTransformAgent(opencode, "opencode");
  assertFrontmatterField(result, "maxTurns", "10");
  assertNoFrontmatterField(result, "steps");
});

Deno.test("reverseTransformAgent - unknown model kept as-is (lossy)", () => {
  const claude = `---
name: my-agent
description: My agent
model: claude-custom-model-id
---

Body.
`;
  const result = reverseTransformAgent(claude, "claude");
  assertFrontmatterField(result, "model", "claude-custom-model-id");
});

Deno.test("reverseTransformAgent - claude: all fields pass through as-is", () => {
  const claude = `---
name: my-agent
description: My agent
tools: Read,Grep
disallowedTools: Write
---

Body.
`;
  const result = reverseTransformAgent(claude, "claude");
  assertFrontmatterField(result, "name", "my-agent");
  assertFrontmatterField(result, "tools", "Read,Grep");
  assertFrontmatterField(result, "disallowedTools", "Write");
  assertBodyContains(result, "Body.");
});

Deno.test("reverseTransformAgent - cursor: all fields pass through as-is", () => {
  const cursor = `---
name: my-agent
description: My agent
readonly: true
---

Body.
`;
  const result = reverseTransformAgent(cursor, "cursor");
  assertFrontmatterField(result, "name", "my-agent");
  assertFrontmatterField(result, "readonly", "true");
  assertBodyContains(result, "Body.");
});

// --- crossTransformAgent ---

Deno.test("crossTransformAgent - same IDE: returns content unchanged", () => {
  const logs: string[] = [];
  const result = crossTransformAgent(
    UNIVERSAL_FULL,
    "claude",
    "claude",
    (m) => logs.push(m),
  );
  assertEquals(result, UNIVERSAL_FULL);
  assertEquals(logs.length, 0);
});

Deno.test("crossTransformAgent - claude → opencode: applies full round-trip transform", () => {
  const logs: string[] = [];
  const claudeContent = `---
name: my-agent
description: My agent
tools: Read,Grep
disallowedTools: Write
---

Body.
`;
  const result = crossTransformAgent(
    claudeContent,
    "claude",
    "opencode",
    (m) => logs.push(m),
  );
  assertFrontmatterField(result, "description", "My agent");
  assertNoFrontmatterField(result, "name");
  assertNoFrontmatterField(result, "disallowedTools");
  assertBodyContains(result, "Body.");
  assertEquals(logs.length > 0, true, "Should log transform warning");
});

Deno.test("crossTransformAgent - invalid YAML frontmatter: returns content as-is with warning", () => {
  const logs: string[] = [];
  const invalidContent = `---
  Analyze one agent transcript (JSONL) for errors, friction,
  and improvement opportunities. Input: file path to JSONL
  transcript. Output: structured findings list in markdown.
name: opsbrain-session-reviewer
description: Analyze transcript
readonly: true
---

Body text.
`;
  const result = crossTransformAgent(
    invalidContent,
    "cursor",
    "claude",
    (m) => logs.push(m),
  );
  assertEquals(result, invalidContent, "Should return content unchanged");
  assertEquals(
    logs.some((l) => l.includes("Warning: failed to transform")),
    true,
    "Should log a warning",
  );
});

Deno.test("crossTransformAgent - opencode → claude: renames tools map → opencode_tools, then transforms to claude", () => {
  const logs: string[] = [];
  const opencodeContent = `---
description: My agent
mode: subagent
tools:
  write: false
  read: true
---

Body.
`;
  const result = crossTransformAgent(
    opencodeContent,
    "opencode",
    "claude",
    (m) => logs.push(m),
  );
  assertFrontmatterField(result, "description", "My agent");
  assertNoFrontmatterField(result, "mode");
  assertBodyContains(result, "Body.");
  assertEquals(logs.length > 0, true, "Should log transform warning");
});
