import { assertEquals } from "@std/assert";
import {
  crossTransformAgent,
  reverseTransformAgent,
  transformAgent,
  transformSkillModel,
} from "./transform.ts";

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

const UNIVERSAL_MINIMAL = `---
name: test-executor
description: A minimal agent with no restrictions
mode: subagent
---

You are a minimal agent.
`;

Deno.test("transformAgent - Claude: keeps fields and resolves model tier smart → sonnet", () => {
  const result = transformAgent(UNIVERSAL_FULL, "claude");
  assertFrontmatterField(result, "name", "test-agent");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "tools", "Read, Grep, Glob, Bash");
  assertFrontmatterField(result, "disallowedTools", "Write, Edit");
  assertFrontmatterField(result, "model", "sonnet");
  assertFrontmatterField(result, "effort", "low");
  assertFrontmatterField(result, "maxTurns", "5");
  assertFrontmatterField(result, "background", "true");
  assertFrontmatterField(result, "isolation", "worktree");
  assertFrontmatterField(result, "color", "blue");
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "mode");
  assertNoFrontmatterField(result, "opencode_tools");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - Cursor: keeps fields and resolves model tier smart → slow", () => {
  const result = transformAgent(UNIVERSAL_FULL, "cursor");
  assertFrontmatterField(result, "name", "test-agent");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "readonly", "true");
  assertFrontmatterField(result, "model", "slow");
  assertNoFrontmatterField(result, "tools");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "mode");
  assertNoFrontmatterField(result, "opencode_tools");
  assertNoFrontmatterField(result, "effort");
  assertNoFrontmatterField(result, "maxTurns");
  assertNoFrontmatterField(result, "background");
  assertNoFrontmatterField(result, "isolation");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - OpenCode: model omitted, maxTurns renamed to steps", () => {
  const result = transformAgent(UNIVERSAL_FULL, "opencode");
  assertNoFrontmatterField(result, "name");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  assertFrontmatterField(result, "mode", "subagent");
  // OpenCode has no default model map → model omitted
  assertNoFrontmatterField(result, "model");
  assertFrontmatterField(result, "color", "blue");
  // maxTurns → steps
  assertNoFrontmatterField(result, "maxTurns");
  assertFrontmatterField(result, "steps", "5");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "opencode_tools");
  // opencode_tools renamed to tools (as map)
  assertFrontmatterContains(result, "tools:");
  assertFrontmatterContains(result, "write: false");
  assertFrontmatterContains(result, "edit: false");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("transformAgent - OpenCode with custom model map resolves tier", () => {
  const result = transformAgent(UNIVERSAL_FULL, "opencode", {
    smart: "claude-sonnet-4-5-20250514",
    fast: "gpt-4o-mini",
  });
  assertFrontmatterField(result, "model", "claude-sonnet-4-5-20250514");
});

Deno.test("transformAgent - model tier max → opus for Claude", () => {
  const content = `---
name: max-agent
description: Agent using max tier
model: max
---

Body.
`;
  const result = transformAgent(content, "claude");
  assertFrontmatterField(result, "model", "opus");
});

Deno.test("transformAgent - model tier fast → haiku for Claude", () => {
  const content = `---
name: fast-agent
description: Agent using fast tier
model: fast
---

Body.
`;
  const result = transformAgent(content, "claude");
  assertFrontmatterField(result, "model", "haiku");
});

Deno.test("transformAgent - model tier cheap → haiku for Claude", () => {
  const content = `---
name: cheap-agent
description: Agent using cheap tier
model: cheap
---

Body.
`;
  const result = transformAgent(content, "claude");
  assertFrontmatterField(result, "model", "haiku");
});

Deno.test("transformAgent - model tier fast → fast for Cursor", () => {
  const content = `---
name: fast-agent
description: Agent using fast tier
model: fast
---

Body.
`;
  const result = transformAgent(content, "cursor");
  assertFrontmatterField(result, "model", "fast");
});

Deno.test("transformAgent - model inherit → field omitted", () => {
  const content = `---
name: inherit-agent
description: Agent inheriting model
model: inherit
---

Body.
`;
  const result = transformAgent(content, "claude");
  assertNoFrontmatterField(result, "model");
});

Deno.test("transformAgent - absent model → field omitted", () => {
  const result = transformAgent(UNIVERSAL_MINIMAL, "claude");
  assertNoFrontmatterField(result, "model");
});

Deno.test("transformAgent - custom model map overrides defaults", () => {
  const content = `---
name: custom-agent
description: Agent with custom map
model: smart
---

Body.
`;
  const result = transformAgent(content, "claude", {
    smart: "claude-opus-4-6-20260401",
  });
  assertFrontmatterField(result, "model", "claude-opus-4-6-20260401");
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
  assertFrontmatterContains(result, "description:");
  assertBodyContains(result, "Body.");
});

// --- transformSkillModel ---

Deno.test("transformSkillModel - resolves tier smart → sonnet for Claude", () => {
  const content = `---
name: my-skill
description: A skill
model: smart
effort: high
---

# Skill body
`;
  const result = transformSkillModel(content, "claude");
  assertFrontmatterField(result, "model", "sonnet");
  assertFrontmatterField(result, "effort", "high");
  assertBodyContains(result, "# Skill body");
});

Deno.test("transformSkillModel - resolves tier cheap → haiku for Claude", () => {
  const content = `---
name: my-skill
description: A skill
model: cheap
---

Body.
`;
  const result = transformSkillModel(content, "claude");
  assertFrontmatterField(result, "model", "haiku");
});

Deno.test("transformSkillModel - OpenCode without map omits model", () => {
  const content = `---
name: my-skill
description: A skill
model: smart
---

Body.
`;
  const result = transformSkillModel(content, "opencode");
  assertNoFrontmatterField(result, "model");
});

Deno.test("transformSkillModel - OpenCode with custom map resolves", () => {
  const content = `---
name: my-skill
description: A skill
model: smart
---

Body.
`;
  const result = transformSkillModel(content, "opencode", {
    smart: "gpt-4o",
  });
  assertFrontmatterField(result, "model", "gpt-4o");
});

Deno.test("transformSkillModel - preserves multiline YAML formatting", () => {
  const content = `---
name: my-skill
description: >-
  A long multiline
  description with special: chars
model: smart
effort: high
---

# Skill body
`;
  const result = transformSkillModel(content, "claude");
  // Verify the multiline description is NOT re-serialized
  assertFrontmatterContains(result, "description: >-");
  assertFrontmatterContains(result, "  A long multiline");
  assertFrontmatterField(result, "model", "sonnet");
});

Deno.test("transformSkillModel - no frontmatter returns content unchanged", () => {
  const content = "# No frontmatter\nJust body.";
  assertEquals(transformSkillModel(content, "claude"), content);
});

Deno.test("transformSkillModel - no model field returns content unchanged", () => {
  const content = `---
name: my-skill
description: A skill
---

Body.
`;
  assertEquals(transformSkillModel(content, "claude"), content);
});

Deno.test("transformSkillModel - inherit tier removes model field", () => {
  const content = `---
name: my-skill
description: A skill
model: inherit
---

Body.
`;
  const result = transformSkillModel(content, "claude");
  assertNoFrontmatterField(result, "model");
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
