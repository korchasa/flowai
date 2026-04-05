import { assertEquals } from "@std/assert";
import {
  AgentFrontmatterSchema,
  parseFrontmatter,
  type ResourceError,
  SkillFrontmatterSchema,
  validateFrontmatter,
} from "./resource-types.ts";

// --- parseFrontmatter ---

Deno.test("parseFrontmatter: extracts valid YAML", () => {
  const content = `---
name: my-skill
description: A test skill
---
# Body`;
  const result = parseFrontmatter(content);
  assertEquals(result !== null, true);
  assertEquals(result!.data.name, "my-skill");
  assertEquals(result!.data.description, "A test skill");
});

Deno.test("parseFrontmatter: returns null for missing frontmatter", () => {
  assertEquals(parseFrontmatter("# No frontmatter"), null);
});

Deno.test("parseFrontmatter: returns null for broken frontmatter", () => {
  assertEquals(parseFrontmatter("---\nno closing"), null);
});

// --- validateFrontmatter: required fields ---

Deno.test("schema: missing required 'name' is error", () => {
  const errors = validateFrontmatter("test", "C", {
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "Required");
});

Deno.test("schema: empty required 'name' is error", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "",
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "must not be empty");
});

Deno.test("schema: missing required 'description' is error", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "test",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "Required");
});

Deno.test("schema: optional field can be absent", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "test",
    description: "desc",
  }, SkillFrontmatterSchema);
  assertEquals(errors, []);
});

// --- name constraints ---

Deno.test("name: exceeding 64 chars is error", () => {
  const long = "a".repeat(65);
  const errors = validateFrontmatter(long, "C", {
    name: long,
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "≤64");
});

Deno.test("name: uppercase is error", () => {
  const errors = validateFrontmatter("Test", "C", {
    name: "Test",
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "leading/trailing/consecutive");
});

Deno.test("name: leading hyphen is error", () => {
  const errors = validateFrontmatter("-bad", "C", {
    name: "-bad",
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "leading/trailing/consecutive");
});

Deno.test("name: consecutive hyphens is error", () => {
  const errors = validateFrontmatter("my--skill", "C", {
    name: "my--skill",
    description: "desc",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "leading/trailing/consecutive");
});

// --- description constraints ---

Deno.test("description: exceeding 1024 chars is error", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "test",
    description: "x".repeat(1025),
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "≤1024");
});

Deno.test("description: at exactly 1024 chars passes", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "test",
    description: "x".repeat(1024),
  }, SkillFrontmatterSchema);
  assertEquals(errors, []);
});

// --- name match target ---

Deno.test("nameMatchTarget: matching passes", () => {
  const errors = validateFrontmatter(
    "my-skill",
    "C",
    {
      name: "my-skill",
      description: "desc",
    },
    SkillFrontmatterSchema,
    "my-skill",
  );
  assertEquals(errors, []);
});

Deno.test("nameMatchTarget: mismatch is error", () => {
  const errors = validateFrontmatter(
    "my-skill",
    "C",
    {
      name: "other",
      description: "desc",
    },
    SkillFrontmatterSchema,
    "my-skill",
  );
  assertHasMessage(errors, "does not match");
});

// --- unknown fields ---

Deno.test("strict: unknown field is error", () => {
  const errors = validateFrontmatter("test", "C", {
    name: "test",
    description: "desc",
    unknown_field: "value",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "Unrecognized key");
});

// --- SKILL_SCHEMA integration ---

Deno.test("SKILL_SCHEMA: valid full skill passes", () => {
  const errors = validateFrontmatter(
    "my-skill",
    "FR",
    {
      name: "my-skill",
      description: "A valid skill",
      "disable-model-invocation": true,
      license: "MIT",
      model: "smart",
      effort: "high",
      "argument-hint": "task description",
      "allowed-tools": "Bash(deno:*)",
    },
    SkillFrontmatterSchema,
    "my-skill",
  );
  assertEquals(errors, []);
});

Deno.test("SKILL_SCHEMA: valid minimal skill passes", () => {
  const errors = validateFrontmatter(
    "my-skill",
    "FR",
    {
      name: "my-skill",
      description: "A valid skill",
    },
    SkillFrontmatterSchema,
    "my-skill",
  );
  assertEquals(errors, []);
});

Deno.test("SKILL_SCHEMA: disable-model-invocation as string is error", () => {
  const errors = validateFrontmatter("my-skill", "FR", {
    name: "my-skill",
    description: "desc",
    "disable-model-invocation": "yes",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "boolean");
});

// --- AGENT_SCHEMA integration ---

Deno.test("AGENT_SCHEMA: valid full agent passes", () => {
  const errors = validateFrontmatter(
    "test-agent",
    "AG",
    {
      name: "test-agent",
      description: "A test agent",
      tools: "Read, Grep, Glob, Bash",
      disallowedTools: "Write, Edit",
      readonly: true,
      mode: "subagent",
      opencode_tools: { write: false, edit: false },
      model: "cheap",
      effort: "low",
      maxTurns: 10,
      background: false,
      isolation: "worktree",
      color: "blue",
    },
    AgentFrontmatterSchema,
    "test-agent",
  );
  assertEquals(errors, []);
});

Deno.test("AGENT_SCHEMA: valid minimal agent passes", () => {
  const errors = validateFrontmatter(
    "test-agent",
    "AG",
    {
      name: "test-agent",
      description: "A test agent",
    },
    AgentFrontmatterSchema,
    "test-agent",
  );
  assertEquals(errors, []);
});

Deno.test("AGENT_SCHEMA: tools as array is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    tools: ["Read", "Grep"],
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "string");
});

Deno.test("AGENT_SCHEMA: opencode_tools with string values is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    opencode_tools: { write: "no" },
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "boolean");
});

Deno.test("AGENT_SCHEMA: readonly as string is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    readonly: "yes",
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "boolean");
});

Deno.test("AGENT_SCHEMA: unknown field is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    extra: "value",
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "Unrecognized key");
});

Deno.test("AGENT_SCHEMA: invalid effort value is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    effort: "ultra",
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "Invalid enum");
});

Deno.test("AGENT_SCHEMA: maxTurns as string is error", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    maxTurns: "10",
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "number");
});

Deno.test("SKILL_SCHEMA: invalid effort value is error", () => {
  const errors = validateFrontmatter("my-skill", "FR", {
    name: "my-skill",
    description: "desc",
    effort: "ultra",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "Invalid enum");
});

Deno.test("SKILL_SCHEMA: concrete model name (sonnet) is error — must use tiers", () => {
  const errors = validateFrontmatter("my-skill", "FR", {
    name: "my-skill",
    description: "desc",
    model: "sonnet",
  }, SkillFrontmatterSchema);
  assertHasMessage(errors, "Invalid enum");
});

Deno.test("AGENT_SCHEMA: concrete model name (opus) is error — must use tiers", () => {
  const errors = validateFrontmatter("test-agent", "AG", {
    name: "test-agent",
    description: "desc",
    model: "opus",
  }, AgentFrontmatterSchema);
  assertHasMessage(errors, "Invalid enum");
});

// --- Model tier validation: every valid tier passes ---

for (const tier of ["max", "smart", "fast", "cheap", "inherit"]) {
  Deno.test(`SKILL_SCHEMA: model tier '${tier}' is valid`, () => {
    const errors = validateFrontmatter("my-skill", "FR", {
      name: "my-skill",
      description: "desc",
      model: tier,
    }, SkillFrontmatterSchema);
    assertEquals(errors, []);
  });

  Deno.test(`AGENT_SCHEMA: model tier '${tier}' is valid`, () => {
    const errors = validateFrontmatter("test-agent", "AG", {
      name: "test-agent",
      description: "desc",
      model: tier,
    }, AgentFrontmatterSchema);
    assertEquals(errors, []);
  });
}

// --- Helper ---

function assertHasMessage(errors: ResourceError[], substring: string): void {
  const found = errors.some((e) => e.message.includes(substring));
  if (!found) {
    throw new Error(
      `Expected message containing '${substring}' in: ${
        JSON.stringify(errors)
      }`,
    );
  }
}
