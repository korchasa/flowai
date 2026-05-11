import { assertEquals } from "@std/assert";
import {
  reverseTransformAgent,
  transformAgent,
  transformSkillModel,
} from "./transform.ts";
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

// [FR-DIST.MAPPING](../../documents/requirements.md#fr-dist.mapping-cross-ide-resource-mapping-universal-representation) — Codex model tier resolution
Deno.test("transformAgent - model tier smart → gpt-5.3-codex for Codex", () => {
  const content = `---
name: smart-agent
description: Agent using smart tier
model: smart
---

Body.
`;
  const result = transformAgent(content, "codex");
  assertFrontmatterField(result, "model", "gpt-5.3-codex");
});

Deno.test("transformAgent - model tier max → gpt-5.4 for Codex", () => {
  const content = `---
name: max-agent
description: Max tier
model: max
---

Body.
`;
  const result = transformAgent(content, "codex");
  assertFrontmatterField(result, "model", "gpt-5.4");
});

Deno.test("transformAgent - model tier fast → gpt-5.4-mini for Codex", () => {
  const content = `---
name: fast-agent
description: Fast tier
model: fast
---

Body.
`;
  const result = transformAgent(content, "codex");
  assertFrontmatterField(result, "model", "gpt-5.4-mini");
});

Deno.test("transformAgent - Codex drops Claude/Cursor-only fields", () => {
  const result = transformAgent(UNIVERSAL_FULL, "codex");
  assertFrontmatterField(result, "name", "test-agent");
  assertFrontmatterField(
    result,
    "description",
    "A test agent for unit testing",
  );
  // Dropped fields
  assertNoFrontmatterField(result, "tools");
  assertNoFrontmatterField(result, "disallowedTools");
  assertNoFrontmatterField(result, "readonly");
  assertNoFrontmatterField(result, "mode");
  assertNoFrontmatterField(result, "opencode_tools");
  assertNoFrontmatterField(result, "effort");
  assertNoFrontmatterField(result, "maxTurns");
  assertNoFrontmatterField(result, "background");
  assertNoFrontmatterField(result, "isolation");
  assertNoFrontmatterField(result, "color");
  assertBodyContains(result, "You are a test agent. Do test things.");
});

Deno.test("reverseTransformAgent - codex: model gpt-5.3-codex → tier smart", () => {
  const codex = `---
name: my-agent
description: My agent
model: gpt-5.3-codex
---

Body.
`;
  const result = reverseTransformAgent(codex, "codex");
  assertFrontmatterField(result, "model", "smart");
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
