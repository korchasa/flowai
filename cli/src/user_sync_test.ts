import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import type { FlowConfig } from "./types.ts";
import { KNOWN_IDES } from "./types.ts";
import {
  collectUserResources,
  computeUserSyncPlan,
  runUserSync,
  scanIdeResources,
} from "./user_sync.ts";
import { processPlan, type SyncOptions } from "./sync.ts";

// Minimal config used across tests
const BASE_CONFIG: FlowConfig = {
  version: "1.0",
  ides: ["claude", "opencode"],
  skills: { include: [], exclude: [] },
  agents: { include: [], exclude: [] },
  commands: { include: [], exclude: [] },
  userSync: true,
};

const AGENT_CONTENT = `---
name: my-agent
description: My custom agent
tools: Read,Grep
---

You are my agent.
`;

const SKILL_CONTENT = `# My Skill

## Description
A custom user skill.
`;

// --- scanIdeResources ---

Deno.test("scanIdeResources - skips flow-* framework resources", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/flow-commit.md", AGENT_CONTENT);
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-agent");
});

Deno.test("scanIdeResources - returns agent with correct fields", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].type, "agent");
  assertEquals(results[0].name, "my-agent");
  assertEquals(results[0].versions[0].ideName, "claude");
  assertEquals(results[0].versions[0].relPath, "my-agent.md");
  assertEquals(results[0].versions[0].content, AGENT_CONTENT);
});

Deno.test("scanIdeResources - returns skill files recursively", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.claude/skills/my-skill/lib/helper.ts", "// helper");
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/my-skill");
  fs.dirs.add("/cwd/.claude/skills/my-skill/lib");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].type, "skill");
  assertEquals(results[0].name, "my-skill");
  assertEquals(results[0].versions.length, 2);

  const relPaths = results[0].versions.map((v) => v.relPath).sort();
  assertEquals(relPaths, ["my-skill/SKILL.md", "my-skill/lib/helper.ts"]);
});

Deno.test("scanIdeResources - respects agents.exclude filter", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.files.set("/cwd/.claude/agents/other-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");

  const config = {
    ...BASE_CONFIG,
    agents: { include: [], exclude: ["other-agent"] },
  };
  const results = await scanIdeResources("/cwd", KNOWN_IDES.claude, config, fs);
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-agent");
});

Deno.test("scanIdeResources - respects skills.include filter", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.claude/skills/other-skill/SKILL.md", SKILL_CONTENT);
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/my-skill");
  fs.dirs.add("/cwd/.claude/skills/other-skill");

  const config = {
    ...BASE_CONFIG,
    skills: { include: ["my-skill"], exclude: [] },
  };
  const results = await scanIdeResources("/cwd", KNOWN_IDES.claude, config, fs);
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-skill");
});

Deno.test("scanIdeResources - skips flow-* skills", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/flow-commit/SKILL.md", SKILL_CONTENT);
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/flow-commit");
  fs.dirs.add("/cwd/.claude/skills/my-skill");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-skill");
});

// --- collectUserResources ---

Deno.test("collectUserResources - merges same resource from multiple IDEs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.files.set("/cwd/.opencode/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");
  fs.dirs.add("/cwd/.opencode/agents");

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const resources = await collectUserResources("/cwd", ides, BASE_CONFIG, fs);
  assertEquals(resources.length, 1);
  assertEquals(resources[0].name, "my-agent");
  assertEquals(resources[0].versions.length, 2);
});

Deno.test("collectUserResources - handles resource in only one IDE", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");
  // opencode agents dir doesn't exist

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const resources = await collectUserResources("/cwd", ides, BASE_CONFIG, fs);
  assertEquals(resources.length, 1);
  assertEquals(resources[0].versions.length, 1);
  assertEquals(resources[0].versions[0].ideName, "claude");
});

// --- computeUserSyncPlan ---

Deno.test("computeUserSyncPlan - creates plan item for missing target IDE", () => {
  const logs: string[] = [];
  const resource = {
    name: "my-skill",
    type: "skill" as const,
    versions: [{
      path: "/cwd/.claude/skills/my-skill/SKILL.md",
      content: SKILL_CONTENT,
      mtime: null,
      ideName: "claude",
      relPath: "my-skill/SKILL.md",
    }],
  };

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const plans = computeUserSyncPlan(
    [resource],
    ides,
    "/cwd",
    (m) => logs.push(m),
  );

  const opencodePlan = plans.get("opencode")!;
  assertEquals(opencodePlan.length, 1);
  assertEquals(opencodePlan[0].action, "create");
  assertEquals(opencodePlan[0].type, "skill");
  assertEquals(opencodePlan[0].content, SKILL_CONTENT);
  assertEquals(
    opencodePlan[0].targetPath,
    "/cwd/.opencode/skills/my-skill/SKILL.md",
  );

  // Source IDE already has it → ok
  const claudePlan = plans.get("claude")!;
  assertEquals(claudePlan[0].action, "ok");
});

Deno.test("computeUserSyncPlan - ok when content matches in both IDEs (skill)", () => {
  const logs: string[] = [];
  const resource = {
    name: "my-skill",
    type: "skill" as const,
    versions: [
      {
        path: "/cwd/.claude/skills/my-skill/SKILL.md",
        content: SKILL_CONTENT,
        mtime: null,
        ideName: "claude",
        relPath: "my-skill/SKILL.md",
      },
      {
        path: "/cwd/.opencode/skills/my-skill/SKILL.md",
        content: SKILL_CONTENT,
        mtime: null,
        ideName: "opencode",
        relPath: "my-skill/SKILL.md",
      },
    ],
  };

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const plans = computeUserSyncPlan(
    [resource],
    ides,
    "/cwd",
    (m) => logs.push(m),
  );

  for (const ide of ides) {
    const plan = plans.get(ide.name)!;
    assertEquals(plan.length, 1);
    assertEquals(plan[0].action, "ok");
  }
});

Deno.test("computeUserSyncPlan - conflict when content differs in both IDEs (skill)", () => {
  const logs: string[] = [];
  const resource = {
    name: "my-skill",
    type: "skill" as const,
    versions: [
      {
        path: "/cwd/.claude/skills/my-skill/SKILL.md",
        content: "version A",
        mtime: new Date("2026-03-15"),
        ideName: "claude",
        relPath: "my-skill/SKILL.md",
      },
      {
        path: "/cwd/.opencode/skills/my-skill/SKILL.md",
        content: "version B",
        mtime: new Date("2026-03-14"),
        ideName: "opencode",
        relPath: "my-skill/SKILL.md",
      },
    ],
  };

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const plans = computeUserSyncPlan(
    [resource],
    ides,
    "/cwd",
    (m) => logs.push(m),
  );

  // Canonical = claude (newer mtime)
  const claudePlan = plans.get("claude")!;
  assertEquals(claudePlan[0].action, "ok"); // canonical IDE

  const opencodePlan = plans.get("opencode")!;
  assertEquals(opencodePlan[0].action, "conflict");
  assertEquals(opencodePlan[0].content, "version A"); // canonical content
  assertEquals(opencodePlan[0].sourceMtime, new Date("2026-03-15"));
  assertEquals(opencodePlan[0].targetMtime, new Date("2026-03-14"));
});

Deno.test("computeUserSyncPlan - multi-file skill: each file tracked independently", () => {
  const logs: string[] = [];
  const resource = {
    name: "my-skill",
    type: "skill" as const,
    versions: [
      {
        path: "/cwd/.claude/skills/my-skill/SKILL.md",
        content: SKILL_CONTENT,
        mtime: null,
        ideName: "claude",
        relPath: "my-skill/SKILL.md",
      },
      {
        path: "/cwd/.claude/skills/my-skill/lib/helper.ts",
        content: "// helper",
        mtime: null,
        ideName: "claude",
        relPath: "my-skill/lib/helper.ts",
      },
    ],
  };

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const plans = computeUserSyncPlan(
    [resource],
    ides,
    "/cwd",
    (m) => logs.push(m),
  );

  const opencodePlan = plans.get("opencode")!;
  assertEquals(opencodePlan.length, 2);
  assertEquals(opencodePlan.every((p) => p.action === "create"), true);

  const relPaths = opencodePlan.map((p) =>
    p.targetPath.replace("/cwd/.opencode/skills/", "")
  ).sort();
  assertEquals(relPaths, ["my-skill/SKILL.md", "my-skill/lib/helper.ts"]);
});

// --- runUserSync integration ---

Deno.test("runUserSync - create: copies missing skill to target IDE", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/my-skill");
  fs.dirs.add("/cwd/.opencode/skills");

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const options: SyncOptions = { yes: true };
  const logs: string[] = [];

  await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  assertEquals(
    fs.files.has("/cwd/.opencode/skills/my-skill/SKILL.md"),
    true,
    "Skill should be copied to opencode",
  );
  assertEquals(
    fs.files.get("/cwd/.opencode/skills/my-skill/SKILL.md"),
    SKILL_CONTENT,
  );
});

Deno.test("runUserSync - skip mode: conflict not overwritten when user skips", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", "version A");
  fs.files.set("/cwd/.opencode/skills/my-skill/SKILL.md", "version B");
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/my-skill");
  fs.dirs.add("/cwd/.opencode/skills");
  fs.dirs.add("/cwd/.opencode/skills/my-skill");

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const options: SyncOptions = {
    yes: false,
    promptConflicts: (_conflicts) => Promise.resolve([]), // skip all
  };
  const logs: string[] = [];

  const result = await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  // No files overwritten
  assertEquals(
    fs.files.get("/cwd/.opencode/skills/my-skill/SKILL.md"),
    "version B",
  );
  assertEquals(result.totalWritten, 0);
  assertEquals(result.totalSkipped > 0, true);
});

Deno.test("runUserSync - yes mode: conflict overwrites with canonical (newer) version", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", "version A");
  fs.files.set("/cwd/.opencode/skills/my-skill/SKILL.md", "version B");
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/my-skill");
  fs.dirs.add("/cwd/.opencode/skills");
  fs.dirs.add("/cwd/.opencode/skills/my-skill");

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const options: SyncOptions = { yes: true };
  const logs: string[] = [];

  await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  // Both should be canonical version (mtime null → first = claude)
  assertEquals(
    fs.files.get("/cwd/.opencode/skills/my-skill/SKILL.md"),
    "version A",
  );
});

Deno.test("runUserSync - returns early with <2 IDEs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");

  const ides = [KNOWN_IDES.claude]; // only one IDE
  const options: SyncOptions = { yes: true };
  const logs: string[] = [];

  const result = await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  assertEquals(result.totalWritten, 0);
  assertEquals(logs.some((l) => l.includes("fewer than 2")), true);
});

Deno.test("scanIdeResources - skips agents by frameworkNames set", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/deep-research-worker.md", AGENT_CONTENT);
  fs.files.set("/cwd/.claude/agents/my-agent.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");

  const fwNames = new Set(["deep-research-worker"]);
  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
    fwNames,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-agent");
});

Deno.test("scanIdeResources - skips skills by frameworkNames set", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set(
    "/cwd/.claude/skills/deep-research-worker/SKILL.md",
    SKILL_CONTENT,
  );
  fs.files.set("/cwd/.claude/skills/my-skill/SKILL.md", SKILL_CONTENT);
  fs.dirs.add("/cwd/.claude/skills");
  fs.dirs.add("/cwd/.claude/skills/deep-research-worker");
  fs.dirs.add("/cwd/.claude/skills/my-skill");

  const fwNames = new Set(["deep-research-worker"]);
  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.claude,
    BASE_CONFIG,
    fs,
    fwNames,
  );
  assertEquals(results.length, 1);
  assertEquals(results[0].name, "my-skill");
});

// --- Commands ---

const COMMAND_CONTENT = `# Morning Ritual

Perform the daily morning routine.
`;

Deno.test("scanIdeResources - finds commands in commands/ dir", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", COMMAND_CONTENT);
  fs.dirs.add("/cwd/.cursor/commands");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.cursor,
    BASE_CONFIG,
    fs,
  );
  const cmds = results.filter((r) => r.type === "command");
  assertEquals(cmds.length, 1);
  assertEquals(cmds[0].name, "my-cmd");
  assertEquals(cmds[0].type, "command");
  assertEquals(cmds[0].versions[0].content, COMMAND_CONTENT);
  assertEquals(cmds[0].versions[0].relPath, "my-cmd.md");
});

Deno.test("scanIdeResources - skips flow-* commands", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/commands/flow-commit.md", COMMAND_CONTENT);
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", COMMAND_CONTENT);
  fs.dirs.add("/cwd/.cursor/commands");

  const results = await scanIdeResources(
    "/cwd",
    KNOWN_IDES.cursor,
    BASE_CONFIG,
    fs,
  );
  const cmds = results.filter((r) => r.type === "command");
  assertEquals(cmds.length, 1);
  assertEquals(cmds[0].name, "my-cmd");
});

Deno.test("scanIdeResources - respects commands.exclude filter", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", COMMAND_CONTENT);
  fs.files.set("/cwd/.cursor/commands/other-cmd.md", COMMAND_CONTENT);
  fs.dirs.add("/cwd/.cursor/commands");

  const config = {
    ...BASE_CONFIG,
    commands: { include: [], exclude: ["other-cmd"] },
  };
  const results = await scanIdeResources("/cwd", KNOWN_IDES.cursor, config, fs);
  const cmds = results.filter((r) => r.type === "command");
  assertEquals(cmds.length, 1);
  assertEquals(cmds[0].name, "my-cmd");
});

Deno.test("runUserSync - copies commands across IDEs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.cursor/commands/my-cmd.md", COMMAND_CONTENT);
  fs.dirs.add("/cwd/.cursor/commands");
  fs.dirs.add("/cwd/.claude/commands");

  const ides = [KNOWN_IDES.cursor, KNOWN_IDES.claude];
  const options: SyncOptions = { yes: true };
  const logs: string[] = [];

  await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  assertEquals(
    fs.files.has("/cwd/.claude/commands/my-cmd.md"),
    true,
    "Command should be copied to claude",
  );
  assertEquals(
    fs.files.get("/cwd/.claude/commands/my-cmd.md"),
    COMMAND_CONTENT,
  );
});

Deno.test("runUserSync - flow-* agent not synced", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/cwd/.claude/agents/flow-commit.md", AGENT_CONTENT);
  fs.dirs.add("/cwd/.claude/agents");
  fs.dirs.add("/cwd/.opencode/agents");

  const ides = [KNOWN_IDES.claude, KNOWN_IDES.opencode];
  const options: SyncOptions = { yes: true };
  const logs: string[] = [];

  await runUserSync(
    "/cwd",
    ides,
    BASE_CONFIG,
    fs,
    options,
    (m) => logs.push(m),
  );

  assertEquals(fs.files.has("/cwd/.opencode/agents/flow-commit.md"), false);
});

// Re-export processPlan to ensure it's accessible (compile check)
export { processPlan };
