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
