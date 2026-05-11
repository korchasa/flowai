// End-to-end sync to the Codex target.
// [FR-DIST.CODEX-AGENTS](../../documents/requirements.md#fr-dist.codex-agents-openai-codex-subagent-sync) — Codex sidecar TOML + [agents.<name>] block.
// [FR-DIST.CODEX-HOOKS](../../documents/requirements.md#fr-dist.codex-hooks-openai-codex-hook-sync-experimental) — experimental hook gate.
// Split out of sync_test.ts to keep individual test files under 500 lines.
import { assert, assertEquals } from "@std/assert";
import { sync } from "./sync.ts";
import { InMemoryFrameworkSource } from "./source.ts";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { parse as parseToml } from "@std/toml";
import type { FlowConfig } from "./types.ts";

function codexTestSource(): InMemoryFrameworkSource {
  return new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: '1.0'\ndescription: core\n",
      ],
      [
        "framework/core/agents/flowai-console-expert.md",
        `---
name: flowai-console-expert
description: Console specialist — runs shell commands without editing code
model: smart
---

You are a console specialist. Run commands and report results.
Do NOT modify files.
`,
      ],
    ]),
  );
}

function codexTestConfig(): FlowConfig {
  return {
    version: "1.1",
    ides: ["codex"],
    packs: ["core"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };
}

Deno.test("sync - codex target: writes sidecar TOML + [agents.<name>] block", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");
  await sync("/project", codexTestConfig(), fs, {
    yes: true,
    source: codexTestSource(),
    onProgress: () => {},
  });

  // Sidecar written
  const sidecar = await fs.readFile(
    "/project/.codex/agents/flowai-console-expert.toml",
  );
  const parsedSidecar = parseToml(sidecar) as Record<string, unknown>;
  assertEquals(parsedSidecar.name, "flowai-console-expert");
  assertEquals(
    parsedSidecar.description,
    "Console specialist — runs shell commands without editing code",
  );
  const instructions = parsedSidecar.developer_instructions as string;
  assert(
    instructions.includes("You are a console specialist."),
    "sidecar developer_instructions must contain body",
  );

  // config.toml registers the agent
  const config = await fs.readFile("/project/.codex/config.toml");
  const parsedConfig = parseToml(config) as Record<string, unknown>;
  const agents = parsedConfig.agents as Record<string, unknown>;
  assert(agents?.["flowai-console-expert"], "config.toml must register agent");
  const entry = agents["flowai-console-expert"] as Record<string, unknown>;
  assertEquals(entry.config_file, "./agents/flowai-console-expert.toml");

  // [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — legacy manifest file must NOT be created by the
  // new prefix-based flow.
  assertEquals(
    await fs.exists("/project/.codex/flowai-agents.json"),
    false,
    "legacy flowai-agents.json must not be created under the prefix scheme",
  );
});

Deno.test("sync - codex target: removes legacy flowai-agents.json manifest on upgrade", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");
  // Simulate an upgrade: a previous (pre-CLEAN-PREFIX) sync left a manifest.
  await fs.writeFile(
    "/project/.codex/flowai-agents.json",
    `{ "version": 1, "agents": ["flowai-console-expert"] }\n`,
  );

  await sync("/project", codexTestConfig(), fs, {
    yes: true,
    source: codexTestSource(),
    onProgress: () => {},
  });

  assertEquals(
    await fs.exists("/project/.codex/flowai-agents.json"),
    false,
    "legacy manifest must be deleted on next sync after upgrade",
  );
});

Deno.test("sync - codex target: idempotent across two runs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");
  const config = codexTestConfig();
  const source = codexTestSource();

  await sync("/project", config, fs, {
    yes: true,
    source,
    onProgress: () => {},
  });
  const firstConfig = await fs.readFile("/project/.codex/config.toml");
  const firstSidecar = await fs.readFile(
    "/project/.codex/agents/flowai-console-expert.toml",
  );

  await sync("/project", config, fs, {
    yes: true,
    source: codexTestSource(),
    onProgress: () => {},
  });
  const secondConfig = await fs.readFile("/project/.codex/config.toml");
  const secondSidecar = await fs.readFile(
    "/project/.codex/agents/flowai-console-expert.toml",
  );

  assertEquals(firstConfig, secondConfig);
  assertEquals(firstSidecar, secondSidecar);
});

Deno.test("sync - codex target: hand-edited user [agents.X] block survives round-trip", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");

  // Pre-seed config.toml with a user-authored agent.
  await fs.writeFile(
    "/project/.codex/config.toml",
    `model = "gpt-5.4"

[agents.my-custom]
description = "my own agent"
config_file = "./agents/my-custom.toml"
`,
  );

  await sync("/project", codexTestConfig(), fs, {
    yes: true,
    source: codexTestSource(),
    onProgress: () => {},
  });

  const config = await fs.readFile("/project/.codex/config.toml");
  const parsed = parseToml(config) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents["my-custom"], "user-authored agent must survive");
  assert(agents["flowai-console-expert"], "flowai agent must be added");
  assertEquals(parsed.model, "gpt-5.4", "other top-level keys preserved");
});

// [FR-DIST.CODEX-HOOKS](../../documents/requirements.md#fr-dist.codex-hooks-openai-codex-hook-sync-experimental) — Experimental gate
Deno.test("sync - codex target: skips hook install when experimental.codexHooks is absent", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: '1.0'\ndescription: core\n",
      ],
      [
        "framework/core/hooks/lint-on-edit/hook.yaml",
        "event: PostToolUse\nmatcher: Edit\ndescription: Lint on edit\n",
      ],
      [
        "framework/core/hooks/lint-on-edit/run.ts",
        "// lint",
      ],
    ]),
  );

  const logs: string[] = [];
  await sync(
    "/project",
    {
      version: "1.1",
      ides: ["codex"],
      packs: ["core"],
      skills: { include: [], exclude: [] },
      agents: { include: [], exclude: [] },
      commands: { include: [], exclude: [] },
      // experimental absent → hook install should be skipped
    },
    fs,
    { yes: true, source, onProgress: (m) => logs.push(m) },
  );

  // hooks.json must NOT be written when the gate is closed.
  assertEquals(await fs.exists("/project/.codex/hooks.json"), false);
  assert(
    logs.some((l) => l.includes("experimental.codexHooks")),
    `expected skip info log, got: ${logs.join("\\n")}`,
  );
});

Deno.test("sync - codex target: installs hooks when experimental.codexHooks is true", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: '1.0'\ndescription: core\n",
      ],
      [
        "framework/core/hooks/lint-on-edit/hook.yaml",
        "event: PostToolUse\nmatcher: Edit\ndescription: Lint on edit\n",
      ],
      [
        "framework/core/hooks/lint-on-edit/run.ts",
        "// lint",
      ],
    ]),
  );

  await sync(
    "/project",
    {
      version: "1.1",
      ides: ["codex"],
      packs: ["core"],
      skills: { include: [], exclude: [] },
      agents: { include: [], exclude: [] },
      commands: { include: [], exclude: [] },
      experimental: { codexHooks: true },
    },
    fs,
    { yes: true, source, onProgress: () => {} },
  );

  // Hooks.json written with Claude-compatible nested shape.
  assertEquals(await fs.exists("/project/.codex/hooks.json"), true);
  const hooksText = await fs.readFile("/project/.codex/hooks.json");
  const parsed = JSON.parse(hooksText) as Record<string, unknown>;
  const hooks = parsed.hooks as Record<string, unknown>;
  assert(hooks?.PostToolUse, "PostToolUse key should be present");
});

Deno.test("sync - codex target: removes stale agent on second run when excluded", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project");
  fs.dirs.add("/project/.codex");
  const source = codexTestSource();

  // First sync: agent is included.
  await sync("/project", codexTestConfig(), fs, {
    yes: true,
    source,
    onProgress: () => {},
  });
  assertEquals(
    await fs.exists("/project/.codex/agents/flowai-console-expert.toml"),
    true,
  );

  // Second sync: exclude the agent.
  const configExcluded = {
    ...codexTestConfig(),
    agents: { include: [], exclude: ["flowai-console-expert"] },
  };
  await sync("/project", configExcluded, fs, {
    yes: true,
    source: codexTestSource(),
    onProgress: () => {},
  });

  // Sidecar and config.toml block should be gone.
  assertEquals(
    await fs.exists("/project/.codex/agents/flowai-console-expert.toml"),
    false,
  );
  const config = await fs.readFile("/project/.codex/config.toml");
  const parsed = parseToml(config) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown> | undefined;
  assertEquals(
    agents?.["flowai-console-expert"],
    undefined,
    "agent block should be removed",
  );
});
