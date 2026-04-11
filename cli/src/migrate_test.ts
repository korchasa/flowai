import { assert, assertEquals, assertRejects } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { KNOWN_IDES } from "./types.ts";
import { buildMigratePlan, runMigrate, scanAllResources } from "./migrate.ts";
import { parse as parseToml } from "@std/toml";

const AGENT_CLAUDE = `---
name: my-agent
description: My agent
tools: Read,Grep
maxTurns: 10
---

Agent body.
`;

const AGENT_CURSOR = `---
name: my-agent
description: My agent
---

Agent body.
`;

const SKILL_CONTENT = `---
name: my-skill
description: My skill
---

# My Skill
`;

const CMD_CONTENT = `# My Command

Do something.
`;

function noop(_: string) {}

// --- scanAllResources ---

Deno.test("scanAllResources - scans skills, agents, commands", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", CMD_CONTENT);

  const resources = await scanAllResources("/cwd", KNOWN_IDES.cursor, fs);
  assertEquals(resources.length, 3);

  const skill = resources.find((r) => r.name === "my-skill");
  assertEquals(skill?.type, "skill");
  assertEquals(skill?.files.length, 1);
  assertEquals(skill?.files[0].relPath, "my-skill/SKILL.md");

  const agent = resources.find((r) => r.name === "my-agent");
  assertEquals(agent?.type, "agent");

  const cmd = resources.find((r) => r.name === "my-cmd");
  assertEquals(cmd?.type, "command");
});

Deno.test("scanAllResources - includes flowai-* resources (no filter)", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/agents/flowai-commit.md", AGENT_CURSOR);
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);

  const resources = await scanAllResources("/cwd", KNOWN_IDES.cursor, fs);
  assertEquals(resources.length, 2);
  const names = resources.map((r) => r.name);
  assertEquals(names.includes("flowai-commit"), true);
  assertEquals(names.includes("my-agent"), true);
});

Deno.test("scanAllResources - handles missing subdirs gracefully", async () => {
  const fs = new InMemoryFsAdapter();
  // Only agents dir exists
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CLAUDE);

  const resources = await scanAllResources("/cwd", KNOWN_IDES.claude, fs);
  assertEquals(resources.length, 1);
  assertEquals(resources[0].type, "agent");
});

Deno.test("scanAllResources - scans skill subdirectory recursively", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.claude/skills/my-skill/scripts/run.sh", "#!/bin/bash");

  const resources = await scanAllResources("/cwd", KNOWN_IDES.claude, fs);
  assertEquals(resources.length, 1);
  assertEquals(resources[0].files.length, 2);
});

Deno.test("scanAllResources - empty IDE dir returns empty list", async () => {
  const fs = new InMemoryFsAdapter();
  const resources = await scanAllResources("/cwd", KNOWN_IDES.claude, fs);
  assertEquals(resources.length, 0);
});

// --- buildMigratePlan ---

Deno.test("buildMigratePlan - creates plan items for all resources", async () => {
  const fs = new InMemoryFsAdapter();
  const resources = [
    {
      name: "my-skill",
      type: "skill" as const,
      files: [{ relPath: "my-skill/SKILL.md", content: SKILL_CONTENT }],
    },
    {
      name: "my-agent",
      type: "agent" as const,
      files: [{ relPath: "my-agent.md", content: AGENT_CURSOR }],
    },
    {
      name: "my-cmd",
      type: "command" as const,
      files: [{ relPath: "my-cmd.md", content: CMD_CONTENT }],
    },
  ];

  const plan = await buildMigratePlan(
    resources,
    KNOWN_IDES.cursor,
    KNOWN_IDES.claude,
    "/cwd",
    fs,
    {},
    noop,
  );

  assertEquals(plan.length, 3);
  assertEquals(plan.every((i) => i.action === "create"), true);

  const skill = plan.find((i) => i.name === "my-skill");
  assertEquals(skill?.targetPath, "/cwd/.claude/skills/my-skill/SKILL.md");

  const agent = plan.find((i) => i.name === "my-agent");
  assertEquals(agent?.targetPath, "/cwd/.claude/agents/my-agent.md");

  const cmd = plan.find((i) => i.name === "my-cmd");
  assertEquals(cmd?.targetPath, "/cwd/.claude/commands/my-cmd.md");
});

Deno.test("buildMigratePlan - detects ok when target matches", async () => {
  const fs = new InMemoryFsAdapter();
  // Target already has the same content as source (cursor → cursor = no transform)
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);

  const resources = [
    {
      name: "my-agent",
      type: "agent" as const,
      files: [{ relPath: "my-agent.md", content: AGENT_CURSOR }],
    },
  ];

  const plan = await buildMigratePlan(
    resources,
    KNOWN_IDES.cursor,
    KNOWN_IDES.cursor, // same IDE → no transform, content identical
    "/cwd",
    fs,
    {},
    noop,
  );
  // same from/to is guarded in runMigrate, but buildMigratePlan itself allows it
  assertEquals(plan[0].action, "ok");
});

Deno.test("buildMigratePlan - detects conflict when target differs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", "different content");

  const resources = [
    {
      name: "my-agent",
      type: "agent" as const,
      files: [{ relPath: "my-agent.md", content: AGENT_CLAUDE }],
    },
  ];

  const plan = await buildMigratePlan(
    resources,
    KNOWN_IDES.claude,
    KNOWN_IDES.claude,
    "/cwd",
    fs,
    {},
    noop,
  );
  assertEquals(plan[0].action, "conflict");
});

Deno.test("buildMigratePlan - transforms agent for target IDE", async () => {
  const fs = new InMemoryFsAdapter();
  const resources = [
    {
      name: "my-agent",
      type: "agent" as const,
      files: [{ relPath: "my-agent.md", content: AGENT_CLAUDE }],
    },
  ];

  const plan = await buildMigratePlan(
    resources,
    KNOWN_IDES.claude,
    KNOWN_IDES.cursor,
    "/cwd",
    fs,
    {},
    noop,
  );
  // Cursor format should NOT contain claude-specific fields like maxTurns
  assertEquals(plan[0].content.includes("maxTurns"), false);
  assertEquals(plan[0].content.includes("my-agent"), true);
});

// --- runMigrate ---

Deno.test("runMigrate - full migration cursor → claude", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", CMD_CONTENT);

  const result = await runMigrate(
    "/cwd",
    "cursor",
    "claude",
    fs,
    { yes: true, dryRun: false },
    noop,
  );

  assertEquals(result.totalWritten, 3);
  assertEquals(result.errors.length, 0);
  assertEquals(
    await fs.exists("/cwd/.claude/skills/my-skill/SKILL.md"),
    true,
  );
  assertEquals(await fs.exists("/cwd/.claude/agents/my-agent.md"), true);
  assertEquals(await fs.exists("/cwd/.claude/commands/my-cmd.md"), true);
});

Deno.test("runMigrate - dry-run does not write files", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);

  const result = await runMigrate(
    "/cwd",
    "cursor",
    "claude",
    fs,
    { yes: false, dryRun: true },
    noop,
  );

  assertEquals(result.totalWritten, 0);
  assertEquals(await fs.exists("/cwd/.claude/agents/my-agent.md"), false);
});

Deno.test("runMigrate - throws on unknown from IDE", async () => {
  const fs = new InMemoryFsAdapter();
  await assertRejects(
    () =>
      runMigrate("/cwd", "unknown", "claude", fs, {
        yes: true,
        dryRun: false,
      }, noop),
    Error,
    "Unknown IDE",
  );
});

Deno.test("runMigrate - throws on unknown to IDE", async () => {
  const fs = new InMemoryFsAdapter();
  await assertRejects(
    () =>
      runMigrate("/cwd", "claude", "unknown", fs, {
        yes: true,
        dryRun: false,
      }, noop),
    Error,
    "Unknown IDE",
  );
});

Deno.test("runMigrate - throws when from equals to", async () => {
  const fs = new InMemoryFsAdapter();
  await assertRejects(
    () =>
      runMigrate("/cwd", "claude", "claude", fs, {
        yes: true,
        dryRun: false,
      }, noop),
    Error,
    "must differ",
  );
});

Deno.test("runMigrate - empty source IDE produces zero writes", async () => {
  const fs = new InMemoryFsAdapter();

  const result = await runMigrate(
    "/cwd",
    "cursor",
    "claude",
    fs,
    { yes: true, dryRun: false },
    noop,
  );

  assertEquals(result.totalWritten, 0);
});

Deno.test("runMigrate - conflict in --yes mode overwrites", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/agents/my-agent.md", AGENT_CURSOR);
  fs.files.set("/cwd/.claude/agents/my-agent.md", "old content");

  const result = await runMigrate(
    "/cwd",
    "cursor",
    "claude",
    fs,
    { yes: true, dryRun: false },
    noop,
  );

  assertEquals(result.totalConflicts, 1);
  // File was overwritten
  const written = await fs.readFile("/cwd/.claude/agents/my-agent.md");
  assertEquals(written.includes("my-agent"), true);
});

// --- FR-DIST.MIGRATE: Codex bridge (TO / FROM) ---

Deno.test("runMigrate - claude → codex: agents land as TOML sidecars + [agents.X] block", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set(
    "/cwd/.claude/agents/flowai-console-expert.md",
    `---
name: flowai-console-expert
description: Console specialist
tools: Bash, Read
---

Run commands. Report results.
`,
  );
  // Add a skill so migrate has something else to copy (validates non-agent path).
  fs.files.set(
    "/cwd/.claude/skills/my-skill/SKILL.md",
    "---\nname: my-skill\ndescription: x\n---\n\n# body",
  );

  const result = await runMigrate(
    "/cwd",
    "claude",
    "codex",
    fs,
    { yes: true, dryRun: false },
    noop,
  );
  assert(result.totalWritten > 0);

  // Sidecar TOML written
  const sidecar = await fs.readFile(
    "/cwd/.codex/agents/flowai-console-expert.toml",
  );
  const parsedSidecar = parseToml(sidecar) as Record<string, unknown>;
  assertEquals(parsedSidecar.name, "flowai-console-expert");
  assertEquals(parsedSidecar.description, "Console specialist");
  const instr = parsedSidecar.developer_instructions as string;
  assert(instr.includes("Run commands."));

  // config.toml has the registration
  const config = await fs.readFile("/cwd/.codex/config.toml");
  const parsedConfig = parseToml(config) as Record<string, unknown>;
  const agents = parsedConfig.agents as Record<string, unknown>;
  assert(agents?.["flowai-console-expert"]);

  // Skill also copied to .codex/skills/
  assert(await fs.exists("/cwd/.codex/skills/my-skill/SKILL.md"));
});

Deno.test("runMigrate - codex → claude: reconstructs agent markdown from TOML sidecar", async () => {
  const fs = new InMemoryFsAdapter();
  // Pre-seed a Codex workspace with an agent.
  fs.files.set(
    "/cwd/.codex/config.toml",
    `[agents.flowai-console-expert]
description = "Console specialist"
config_file = "./agents/flowai-console-expert.toml"
`,
  );
  fs.files.set(
    "/cwd/.codex/agents/flowai-console-expert.toml",
    `name = "flowai-console-expert"
description = "Console specialist"
developer_instructions = '''
Run commands. Report results.
'''
`,
  );

  const result = await runMigrate(
    "/cwd",
    "codex",
    "claude",
    fs,
    { yes: true, dryRun: false },
    noop,
  );
  assert(result.totalWritten > 0);

  // Markdown agent written in Claude format
  const md = await fs.readFile(
    "/cwd/.claude/agents/flowai-console-expert.md",
  );
  assert(md.includes("name: flowai-console-expert"));
  assert(md.includes("description: Console specialist"));
  assert(md.includes("Run commands."));
});
