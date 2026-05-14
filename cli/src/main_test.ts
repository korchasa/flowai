import { assert, assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { InMemoryFrameworkSource } from "./source.ts";
import { sync } from "./sync.ts";
import type { FlowConfig } from "./types.ts";

/** Universal agent content with all IDE fields */
const UNIVERSAL_AGENT = `---
name: test-agent
description: A test agent
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
readonly: true
mode: subagent
opencode_tools:
  write: false
  edit: false
---

You are a test agent.
`;

/** Create mock framework source with test skills and agents (flat structure) */
function createMockSource(): InMemoryFrameworkSource {
  return new InMemoryFrameworkSource(
    new Map([
      ["framework/skills/test-skill/SKILL.md", "# Test Skill"],
      ["framework/skills/test-skill/references/ref.md", "# Reference"],
      ["framework/agents/test-agent.md", UNIVERSAL_AGENT],
    ]),
  );
}

Deno.test("sync - full integration: downloads skills and agents to IDE dirs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.cursor");
  fs.dirs.add("/project/.claude");

  const config: FlowConfig = {
    version: "1.0",
    ides: ["cursor", "claude"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  const logs: string[] = [];
  const result = await sync("/project", config, fs, {
    yes: true,
    source: createMockSource(),
    onProgress: (msg) => logs.push(msg),
  });

  // Skills written to both IDEs
  assertEquals(
    await fs.readFile("/project/.cursor/skills/test-skill/SKILL.md"),
    "# Test Skill",
  );
  assertEquals(
    await fs.readFile("/project/.claude/skills/test-skill/SKILL.md"),
    "# Test Skill",
  );
  assertEquals(
    await fs.readFile(
      "/project/.cursor/skills/test-skill/references/ref.md",
    ),
    "# Reference",
  );

  // Agents written per-IDE with IDE-specific frontmatter
  const cursorAgent = await fs.readFile(
    "/project/.cursor/agents/test-agent.md",
  );
  const claudeAgent = await fs.readFile(
    "/project/.claude/agents/test-agent.md",
  );

  // Claude: has tools, disallowedTools; no readonly, no mode, no opencode_tools
  assert(claudeAgent.includes("tools:"));
  assert(claudeAgent.includes("Read, Grep, Glob, Bash"));
  assert(claudeAgent.includes("disallowedTools:"));
  assert(claudeAgent.includes("Write, Edit"));
  assert(!claudeAgent.includes("readonly:"));
  assert(!claudeAgent.includes("mode:"));
  assert(!claudeAgent.includes("opencode_tools:"));
  assert(claudeAgent.includes("You are a test agent."));

  // Cursor: has readonly; no tools, no disallowedTools, no mode, no opencode_tools
  assert(cursorAgent.includes("readonly: true"));
  assert(!cursorAgent.includes("tools:"));
  assert(!cursorAgent.includes("disallowedTools:"));
  assert(!cursorAgent.includes("mode:"));
  assert(!cursorAgent.includes("opencode_tools:"));
  assert(cursorAgent.includes("You are a test agent."));

  assert(result.totalWritten > 0);
  assertEquals(result.errors.length, 0);
});

Deno.test("sync - include filter with nonexistent skill syncs only agents", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.cursor");

  const config: FlowConfig = {
    version: "1.0",
    ides: ["cursor"],
    skills: { include: ["nonexistent-skill"], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  const result = await sync("/project", config, fs, {
    yes: true,
    source: createMockSource(),
    onProgress: () => {},
  });

  // No skills matched
  assertEquals(result.totalWritten, 1); // Only agent written
});

Deno.test("sync - conflict handling with --yes overwrites", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.cursor");
  // Pre-existing modified file
  await fs.writeFile(
    "/project/.cursor/skills/test-skill/SKILL.md",
    "# Modified locally",
  );

  const config: FlowConfig = {
    version: "1.0",

    ides: ["cursor"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  const result = await sync("/project", config, fs, {
    yes: true,
    source: createMockSource(),
    onProgress: () => {},
  });

  // File should be overwritten
  assertEquals(
    await fs.readFile("/project/.cursor/skills/test-skill/SKILL.md"),
    "# Test Skill",
  );
  assert(result.totalConflicts > 0);
});

Deno.test("sync - pack commands install into .{ide}/skills/ with injected flag", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");

  // Pack structure with one command (no flag in source) and one skill.
  // Command SKILL.md deliberately omits `disable-model-invocation`
  // so the test proves the reader injects it.
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/core/pack.yaml", "name: core\nversion: 1.0.0\n"],
      [
        "framework/core/commands/flowai-demo/SKILL.md",
        "---\nname: flowai-demo\ndescription: A demo command\n---\n\n# Demo\n",
      ],
      [
        "framework/core/commands/flowai-demo/scripts/helper.ts",
        "export const X = 1;\n",
      ],
      [
        "framework/core/skills/flowai-foo/SKILL.md",
        "---\nname: flowai-foo\ndescription: A demo skill\n---\n\n# Skill\n",
      ],
    ]),
  );

  const config: FlowConfig = {
    version: "1.1",
    ides: ["claude"],
    packs: ["core"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  const result = await sync("/project", config, fs, {
    yes: true,
    source,
    onProgress: () => {},
  });

  // Both primitives live in the same target dir .claude/skills/.
  const commandSkillMd = await fs.readFile(
    "/project/.claude/skills/flowai-demo/SKILL.md",
  );
  const skillSkillMd = await fs.readFile(
    "/project/.claude/skills/flowai-foo/SKILL.md",
  );

  // Command SKILL.md was augmented with the injected flag.
  assert(
    /^disable-model-invocation:\s*true$/m.test(commandSkillMd),
    `Expected injected flag in installed command SKILL.md:\n${commandSkillMd}`,
  );
  // Skill SKILL.md must NOT carry the flag — agents must be able to invoke it.
  assert(
    !/disable-model-invocation/.test(skillSkillMd),
    `Skill SKILL.md must not have disable-model-invocation:\n${skillSkillMd}`,
  );

  // Command co-located scripts/ copied alongside.
  assertEquals(
    await fs.readFile("/project/.claude/skills/flowai-demo/scripts/helper.ts"),
    "export const X = 1;\n",
  );

  assertEquals(result.errors.length, 0);
});

Deno.test("sync - commands.exclude removes command from target dir", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");

  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/core/pack.yaml", "name: core\nversion: 1.0.0\n"],
      [
        "framework/core/commands/flowai-keep/SKILL.md",
        "---\nname: flowai-keep\ndescription: x\n---\n",
      ],
      [
        "framework/core/commands/flowai-drop/SKILL.md",
        "---\nname: flowai-drop\ndescription: y\n---\n",
      ],
    ]),
  );

  // Pre-create an installed flowai-drop to simulate stale state.
  await fs.writeFile(
    "/project/.claude/skills/flowai-drop/SKILL.md",
    "# stale\n",
  );

  const config: FlowConfig = {
    version: "1.1",
    ides: ["claude"],
    packs: ["core"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: ["flowai-drop"] },
  };

  await sync("/project", config, fs, {
    yes: true,
    source,
    onProgress: () => {},
  });

  // flowai-keep installed...
  assert(
    await fs.exists("/project/.claude/skills/flowai-keep/SKILL.md"),
  );
  // ...flowai-drop removed by delete plan.
  assert(
    !(await fs.exists("/project/.claude/skills/flowai-drop/SKILL.md")),
  );
});

Deno.test("sync - CLAUDE.md symlinks created when claude IDE active", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.claude");
  await fs.writeFile("/project/AGENTS.md", "# Agents config");

  const config: FlowConfig = {
    version: "1.0",

    ides: ["claude"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  const result = await sync("/project", config, fs, {
    yes: true,
    source: createMockSource(),
    onProgress: () => {},
  });

  assertEquals(result.symlinkResult!.created.length, 1);
  assertEquals(await fs.readLink("/project/CLAUDE.md"), "AGENTS.md");
});
