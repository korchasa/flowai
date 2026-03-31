import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import {
  parseFrontmatter,
  validateAgentFrontmatter,
  validateAll,
  validateSkillFrontmatter,
} from "./validate_frontmatter.ts";

// === parseFrontmatter ===

Deno.test("parseFrontmatter - valid YAML", () => {
  const fm = parseFrontmatter(
    '---\nname: my-skill\ndescription: "A skill"\n---\n# Body',
  );
  assertEquals(fm, { name: "my-skill", description: "A skill" });
});

Deno.test("parseFrontmatter - no frontmatter", () => {
  assertEquals(parseFrontmatter("# Just a heading"), null);
});

Deno.test("parseFrontmatter - empty frontmatter", () => {
  assertEquals(parseFrontmatter("---\n\n---\n# Body"), null);
});

Deno.test("parseFrontmatter - invalid YAML", () => {
  assertEquals(parseFrontmatter("---\n: : :\n---"), null);
});

Deno.test("parseFrontmatter - array YAML", () => {
  assertEquals(parseFrontmatter("---\n- item1\n- item2\n---"), null);
});

Deno.test("parseFrontmatter - multiline description", () => {
  const fm = parseFrontmatter(
    "---\nname: s\ndescription: >\n  Long\n  description\n---\n# Body",
  );
  assertEquals(fm?.name, "s");
  assertEquals(typeof fm?.description, "string");
});

// === validateSkillFrontmatter ===

Deno.test("validateSkillFrontmatter - valid skill", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "A useful skill",
  });
  assertEquals(errors, []);
});

Deno.test("validateSkillFrontmatter - missing name", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - missing description", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "description");
});

Deno.test("validateSkillFrontmatter - missing both name and description", () => {
  const errors = validateSkillFrontmatter("my-skill", {});
  assertEquals(errors.length, 2);
});

Deno.test("validateSkillFrontmatter - name mismatch", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "other-skill",
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
  assertEquals(errors[0].message.includes("does not match"), true);
});

Deno.test("validateSkillFrontmatter - invalid name format (underscore)", () => {
  const errors = validateSkillFrontmatter("My_Skill", {
    name: "My_Skill",
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - invalid name format (uppercase)", () => {
  const errors = validateSkillFrontmatter("MySkill", {
    name: "MySkill",
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - name too long", () => {
  const longName = "a" + "-b".repeat(40);
  const errors = validateSkillFrontmatter(longName, {
    name: longName,
    description: "desc",
  });
  assertEquals(errors.some((e) => e.message.includes("exceeds")), true);
});

Deno.test("validateSkillFrontmatter - name is not a string", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: 123,
    description: "desc",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].message.includes("must be a string"), true);
});

Deno.test("validateSkillFrontmatter - description is not a string", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: 42,
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "description");
});

Deno.test("validateSkillFrontmatter - description too long", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "x".repeat(1025),
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "description");
});

Deno.test("validateSkillFrontmatter - optional fields ignored", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "A useful skill",
    "disable-model-invocation": true,
    "allowed-tools": "Read,Write",
    metadata: { version: "1.0" },
  });
  assertEquals(errors, []);
});

// === validateAgentFrontmatter ===

Deno.test("validateAgentFrontmatter - valid agent", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "my-agent",
    description: "A useful agent",
  });
  assertEquals(errors, []);
});

Deno.test("validateAgentFrontmatter - missing name", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    description: "A useful agent",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateAgentFrontmatter - missing description", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "my-agent",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "description");
});

Deno.test("validateAgentFrontmatter - with optional fields (tools, mode)", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "my-agent",
    description: "A useful agent",
    tools: "Read,Write,Bash",
    mode: "subagent",
  });
  assertEquals(errors, []);
});

Deno.test("validateAgentFrontmatter - name mismatch", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "other-agent",
    description: "A useful agent",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

// === validateAll — filesystem integration tests per IDE ===

/** Create a temp dir with given file tree. Returns the root path. */
async function createTempTree(
  files: Record<string, string>,
): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "validate_fm_test_" });
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    await Deno.mkdir(join(full, ".."), { recursive: true });
    await Deno.writeTextFile(full, content);
  }
  return root;
}

const VALID_SKILL_MD = `---
name: flowai-commit
description: Commit helper
---
# Commit`;

const VALID_AGENT_MD = `---
name: flowai-console-expert
description: Console expert agent
---
You are a console expert.`;

const INVALID_SKILL_MD = `---
description: Missing name field
---
# Skill`;

const INVALID_AGENT_MD = `# No frontmatter at all`;

// --- .claude ---

Deno.test("validateAll - .claude: valid skills and agents", async () => {
  const root = await createTempTree({
    ".claude/skills/flowai-commit/SKILL.md": VALID_SKILL_MD,
    ".claude/agents/flowai-console-expert.md": VALID_AGENT_MD,
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .claude: skill missing name", async () => {
  const root = await createTempTree({
    ".claude/skills/flowai-commit/SKILL.md": INVALID_SKILL_MD,
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "name");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .claude: agent without frontmatter", async () => {
  const root = await createTempTree({
    ".claude/agents/flowai-bad-agent.md": INVALID_AGENT_MD,
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "frontmatter");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .claude: skill dir without SKILL.md", async () => {
  const root = await createTempTree({
    ".claude/skills/flowai-broken/scripts/helper.ts": "// helper",
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "SKILL.md");
    assertEquals(errors[0].path, "flowai-broken");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

// --- .cursor ---

Deno.test("validateAll - .cursor: valid skills and agents", async () => {
  const root = await createTempTree({
    ".cursor/skills/flowai-plan/SKILL.md": `---
name: flowai-plan
description: Plan tasks
---
# Plan`,
    ".cursor/agents/flowai-diff-specialist.md": `---
name: flowai-diff-specialist
description: Diff analysis agent
---
You analyze diffs.`,
  });
  try {
    const errors = await validateAll([join(root, ".cursor")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .cursor: skill name mismatch", async () => {
  const root = await createTempTree({
    ".cursor/skills/flowai-commit/SKILL.md": `---
name: wrong-name
description: Mismatched name
---
# Skill`,
  });
  try {
    const errors = await validateAll([join(root, ".cursor")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "name");
    assertEquals(errors[0].message.includes("does not match"), true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .cursor: agent name mismatch", async () => {
  const root = await createTempTree({
    ".cursor/agents/flowai-expert.md": `---
name: flowai-wrong
description: Name mismatch
---
Body`,
  });
  try {
    const errors = await validateAll([join(root, ".cursor")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "name");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

// --- .opencode ---

Deno.test("validateAll - .opencode: valid skills and agents", async () => {
  const root = await createTempTree({
    ".opencode/skills/flowai-review/SKILL.md": `---
name: flowai-review
description: Code review skill
---
# Review`,
    ".opencode/agents/flowai-skill-adapter.md": `---
name: flowai-skill-adapter
description: Adapts skills to project
---
You adapt skills.`,
  });
  try {
    const errors = await validateAll([join(root, ".opencode")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - .opencode: agent missing description", async () => {
  const root = await createTempTree({
    ".opencode/agents/flowai-bad.md": `---
name: flowai-bad
---
Body`,
  });
  try {
    const errors = await validateAll([join(root, ".opencode")]);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].field, "description");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

// --- Cross-IDE (multiple dirs) ---

Deno.test("validateAll - multiple IDE dirs at once", async () => {
  const root = await createTempTree({
    ".claude/skills/flowai-commit/SKILL.md": VALID_SKILL_MD,
    ".cursor/skills/flowai-commit/SKILL.md": VALID_SKILL_MD,
    ".opencode/agents/flowai-console-expert.md": VALID_AGENT_MD,
  });
  try {
    const errors = await validateAll([
      join(root, ".claude"),
      join(root, ".cursor"),
      join(root, ".opencode"),
    ]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - errors from multiple IDE dirs aggregated", async () => {
  const root = await createTempTree({
    ".claude/skills/flowai-commit/SKILL.md": INVALID_SKILL_MD,
    ".cursor/agents/flowai-bad.md": INVALID_AGENT_MD,
  });
  try {
    const errors = await validateAll([
      join(root, ".claude"),
      join(root, ".cursor"),
    ]);
    assertEquals(errors.length, 2);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

// --- Edge cases ---

Deno.test("validateAll - non-existent config dir (no error)", async () => {
  const errors = await validateAll(["/tmp/non-existent-ide-dir-99999"]);
  assertEquals(errors, []);
});

Deno.test("validateAll - empty skills dir", async () => {
  const root = await createTempTree({
    ".claude/skills/.gitkeep": "",
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - non-.md files in agents dir ignored", async () => {
  const root = await createTempTree({
    ".claude/agents/readme.txt": "not an agent",
    ".claude/agents/flowai-valid.md": VALID_AGENT_MD.replace(
      "flowai-console-expert",
      "flowai-valid",
    ),
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - files in skills dir ignored (only dirs scanned)", async () => {
  const root = await createTempTree({
    ".claude/skills/stray-file.md": "not a skill dir",
    ".claude/skills/flowai-valid/SKILL.md": VALID_SKILL_MD.replace(
      "flowai-commit",
      "flowai-valid",
    ),
  });
  try {
    const errors = await validateAll([join(root, ".claude")]);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("validateAll - empty config dirs list", async () => {
  const errors = await validateAll([]);
  assertEquals(errors, []);
});
