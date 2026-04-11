import { assert, assertEquals } from "@std/assert";
import {
  filterNames,
  injectDisableModelInvocation,
  readCommandFiles,
  readPackAssetFiles,
  readPackCommandFiles,
  readPackSkillFiles,
  readSkillFiles,
  resolvePackResources,
  sync,
} from "./sync.ts";
import { InMemoryFrameworkSource } from "./source.ts";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { parse as parseToml } from "@std/toml";
import type { FlowConfig } from "./types.ts";

Deno.test("filterNames - returns all when no include/exclude", () => {
  assertEquals(filterNames(["a", "b", "c"], [], []), ["a", "b", "c"]);
});

Deno.test("filterNames - filters by include", () => {
  assertEquals(filterNames(["a", "b", "c"], ["a", "c"], []), ["a", "c"]);
});

Deno.test("filterNames - filters by exclude", () => {
  assertEquals(filterNames(["a", "b", "c"], [], ["b"]), ["a", "c"]);
});

Deno.test("filterNames - include takes precedence (exclude ignored if include set)", () => {
  // Config validation prevents both set, but logic should handle include-only
  assertEquals(filterNames(["a", "b", "c"], ["a"], []), ["a"]);
});

// --- resolvePackResources tests ---

// Mixed pack structure: commands under commands/, skills under skills/.
// Mirrors the canonical framework layout after the commands/skills split.
const PACK_PATHS = [
  "framework/core/pack.yaml",
  "framework/core/commands/flowai-commit/SKILL.md",
  "framework/core/commands/flowai-plan/SKILL.md",
  "framework/core/agents/flowai-console-expert.md",
  "framework/deno/pack.yaml",
  "framework/deno/skills/flowai-skill-deno-cli/SKILL.md",
];

function makeConfig(overrides: Partial<FlowConfig> = {}): FlowConfig {
  return {
    version: "1.1",
    ides: ["claude"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
    ...overrides,
  };
}

Deno.test("resolvePackResources - selects resources from specified packs", () => {
  const config = makeConfig({ packs: ["core"] });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.skillNames, []);
  assertEquals(result.commandNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: [] defaults to core only", () => {
  const config = makeConfig({ packs: [] });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.skillNames, []);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: undefined (v1 legacy) selects all", () => {
  const config = makeConfig({ packs: undefined });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.skillNames, ["flowai-skill-deno-cli"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - applies commands.exclude after pack expansion", () => {
  const config = makeConfig({
    packs: ["core"],
    commands: { include: [], exclude: ["flowai-plan"] },
  });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
});

Deno.test("resolvePackResources - applies skills.include after pack expansion", () => {
  const config = makeConfig({
    packs: ["core", "deno"],
    skills: {
      include: ["flowai-skill-deno-cli"],
      exclude: [],
    },
    commands: {
      include: ["flowai-commit"],
      exclude: [],
    },
  });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.skillNames, ["flowai-skill-deno-cli"]);
});

// --- Hook and Script resolution tests ---

const PACK_PATHS_WITH_HOOKS_SCRIPTS = [
  "framework/core/pack.yaml",
  "framework/core/commands/flowai-commit/SKILL.md",
  "framework/core/hooks/lint-on-edit/hook.yaml",
  "framework/core/hooks/lint-on-edit/run.ts",
  "framework/core/scripts/check.ts",
  "framework/deno/pack.yaml",
  "framework/deno/scripts/validate.ts",
];

Deno.test("resolvePackResources - extracts hooks from packs", () => {
  const config = makeConfig({ packs: ["core"] });
  const result = resolvePackResources(PACK_PATHS_WITH_HOOKS_SCRIPTS, config);
  assertEquals(result.hookNames, ["lint-on-edit"]);
});

Deno.test("resolvePackResources - extracts scripts from packs", () => {
  const config = makeConfig({ packs: ["core", "deno"] });
  const result = resolvePackResources(PACK_PATHS_WITH_HOOKS_SCRIPTS, config);
  assertEquals(result.scriptNames, ["check.ts", "validate.ts"]);
});

Deno.test("resolvePackResources - packs: [core] only includes core scripts", () => {
  const config = makeConfig({ packs: ["core"] });
  const result = resolvePackResources(PACK_PATHS_WITH_HOOKS_SCRIPTS, config);
  assertEquals(result.scriptNames, ["check.ts"]);
});

// --- Dev-only file exclusion tests (benchmarks + tests) ---

Deno.test("readPackSkillFiles - excludes benchmarks and test files", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/core/skills/flowai-skill-demo/SKILL.md", "# Demo"],
      ["framework/core/skills/flowai-skill-demo/prompt.md", "prompt"],
      ["framework/core/skills/flowai-skill-demo/scripts/helper.ts", "code"],
      [
        "framework/core/skills/flowai-skill-demo/scripts/helper_test.ts",
        "test code",
      ],
      [
        "framework/core/skills/flowai-skill-demo/benchmarks/basic/mod.ts",
        "bench code",
      ],
      [
        "framework/core/skills/flowai-skill-demo/benchmarks/basic/fixture/file.md",
        "fixture",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/skills/flowai-skill-demo/SKILL.md",
    "framework/core/skills/flowai-skill-demo/prompt.md",
    "framework/core/skills/flowai-skill-demo/scripts/helper.ts",
    "framework/core/skills/flowai-skill-demo/scripts/helper_test.ts",
    "framework/core/skills/flowai-skill-demo/benchmarks/basic/mod.ts",
    "framework/core/skills/flowai-skill-demo/benchmarks/basic/fixture/file.md",
  ];

  const files = await readPackSkillFiles(
    ["flowai-skill-demo"],
    allPaths,
    source,
  );
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "flowai-skill-demo/SKILL.md",
    "flowai-skill-demo/prompt.md",
    "flowai-skill-demo/scripts/helper.ts",
  ]);
});

Deno.test("readSkillFiles - excludes benchmarks and test files", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/skills/flowai-skill-demo/SKILL.md", "# Demo"],
      ["framework/skills/flowai-skill-demo/scripts/run.ts", "code"],
      ["framework/skills/flowai-skill-demo/scripts/run_test.ts", "test"],
      [
        "framework/skills/flowai-skill-demo/benchmarks/basic/mod.ts",
        "bench code",
      ],
    ]),
  );
  const allPaths = [
    "framework/skills/flowai-skill-demo/SKILL.md",
    "framework/skills/flowai-skill-demo/scripts/run.ts",
    "framework/skills/flowai-skill-demo/scripts/run_test.ts",
    "framework/skills/flowai-skill-demo/benchmarks/basic/mod.ts",
  ];

  const files = await readSkillFiles(["flowai-skill-demo"], allPaths, source);
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "flowai-skill-demo/SKILL.md",
    "flowai-skill-demo/scripts/run.ts",
  ]);
});

// --- Command reader tests (commands/ subtree + auto-injection) ---

Deno.test("readPackCommandFiles - reads commands from framework/<pack>/commands/", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/commands/flowai-commit/SKILL.md",
        "---\nname: flowai-commit\ndescription: Commit workflow\n---\n\n# Body\n",
      ],
      [
        "framework/core/commands/flowai-commit/scripts/helper.ts",
        "code",
      ],
      [
        "framework/core/commands/flowai-commit/scripts/helper_test.ts",
        "test",
      ],
      [
        "framework/core/commands/flowai-commit/benchmarks/basic/mod.ts",
        "bench",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-commit/scripts/helper.ts",
    "framework/core/commands/flowai-commit/scripts/helper_test.ts",
    "framework/core/commands/flowai-commit/benchmarks/basic/mod.ts",
  ];

  const files = await readPackCommandFiles(
    ["flowai-commit"],
    allPaths,
    source,
  );
  const paths = files.map((f) => f.path);
  assertEquals(paths, [
    "flowai-commit/SKILL.md",
    "flowai-commit/scripts/helper.ts",
  ]);
});

Deno.test("readPackCommandFiles - injects disable-model-invocation into SKILL.md", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/commands/flowai-commit/SKILL.md",
        "---\nname: flowai-commit\ndescription: Commit workflow\n---\n\n# Body\n",
      ],
    ]),
  );
  const allPaths = ["framework/core/commands/flowai-commit/SKILL.md"];
  const files = await readPackCommandFiles(
    ["flowai-commit"],
    allPaths,
    source,
  );
  const skillMd = files.find((f) => f.path === "flowai-commit/SKILL.md");
  assertEquals(skillMd !== undefined, true);
  assertEquals(
    /^disable-model-invocation:\s*true$/m.test(skillMd!.content),
    true,
  );
});

Deno.test("readPackCommandFiles - does NOT inject flag into non-SKILL.md files", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/commands/flowai-commit/SKILL.md",
        "---\nname: flowai-commit\ndescription: x\n---\n",
      ],
      [
        "framework/core/commands/flowai-commit/scripts/run.ts",
        "// scripts should stay untouched\n",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-commit/scripts/run.ts",
  ];
  const files = await readPackCommandFiles(
    ["flowai-commit"],
    allPaths,
    source,
  );
  const script = files.find((f) => f.path.endsWith("run.ts"));
  assertEquals(script!.content, "// scripts should stay untouched\n");
});

Deno.test("readCommandFiles - legacy flat framework/commands/", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/commands/flowai-commit/SKILL.md",
        "---\nname: flowai-commit\ndescription: x\n---\n",
      ],
      [
        "framework/commands/flowai-commit/benchmarks/basic/mod.ts",
        "bench",
      ],
    ]),
  );
  const allPaths = [
    "framework/commands/flowai-commit/SKILL.md",
    "framework/commands/flowai-commit/benchmarks/basic/mod.ts",
  ];
  const files = await readCommandFiles(["flowai-commit"], allPaths, source);
  assertEquals(files.length, 1);
  assertEquals(
    /^disable-model-invocation:\s*true$/m.test(files[0].content),
    true,
  );
});

Deno.test("injectDisableModelInvocation - adds key to frontmatter", () => {
  const input = "---\nname: flowai-commit\ndescription: x\n---\n\nBody\n";
  const output = injectDisableModelInvocation(input);
  assertEquals(
    output,
    "---\nname: flowai-commit\ndescription: x\ndisable-model-invocation: true\n---\n\nBody\n",
  );
});

Deno.test("injectDisableModelInvocation - idempotent if flag present", () => {
  const input =
    "---\nname: flowai-commit\ndescription: x\ndisable-model-invocation: true\n---\n\nBody\n";
  const output = injectDisableModelInvocation(input);
  assertEquals(output, input);
});

Deno.test("injectDisableModelInvocation - handles CRLF line endings", () => {
  const input = "---\r\nname: x\r\ndescription: y\r\n---\r\n\r\nBody\r\n";
  const output = injectDisableModelInvocation(input);
  assertEquals(output.includes("disable-model-invocation: true"), true);
  // Frontmatter block preserved (starts and ends with ---)
  const fmMatch = output.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assertEquals(fmMatch !== null, true);
});

Deno.test("injectDisableModelInvocation - throws on missing frontmatter", () => {
  let threw = false;
  try {
    injectDisableModelInvocation("# No frontmatter\n");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("resolvePackResources - returns commandNames alongside skillNames", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-plan/SKILL.md",
    "framework/core/skills/flowai-skill-foo/SKILL.md",
  ];
  const config = makeConfig({ packs: ["core"] });
  const result = resolvePackResources(paths, config);
  assertEquals(result.skillNames, ["flowai-skill-foo"]);
  assertEquals(result.commandNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.allCommandNames, ["flowai-commit", "flowai-plan"]);
});

Deno.test("resolvePackResources - applies commands.exclude after pack expansion", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-plan/SKILL.md",
  ];
  const config = makeConfig({
    packs: ["core"],
    commands: { include: [], exclude: ["flowai-plan"] },
  });
  const result = resolvePackResources(paths, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.allCommandNames, ["flowai-commit", "flowai-plan"]);
});

// --- Pack asset sync tests ---

Deno.test("readPackAssetFiles - reads assets from selected packs", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/assets/AGENTS.template.md",
        "# Core Rules\n{{PROJECT_RULES}}",
      ],
      [
        "framework/core/assets/AGENTS.documents.template.md",
        "# Documents",
      ],
      ["framework/engineering/assets/report.md", "# Report Template"],
      ["framework/core/commands/flowai-init/SKILL.md", "# Init"],
    ]),
  );
  const allPaths = [
    "framework/core/pack.yaml",
    "framework/core/assets/AGENTS.template.md",
    "framework/core/assets/AGENTS.documents.template.md",
    "framework/core/commands/flowai-init/SKILL.md",
    "framework/engineering/pack.yaml",
    "framework/engineering/assets/report.md",
  ];

  const files = await readPackAssetFiles(allPaths, source, ["core"]);
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "assets/AGENTS.documents.template.md",
    "assets/AGENTS.template.md",
  ]);
  assertEquals(files[1].content, "# Core Rules\n{{PROJECT_RULES}}");
});

Deno.test("readPackAssetFiles - reads from multiple packs", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/core/assets/AGENTS.template.md", "# Core"],
      ["framework/engineering/assets/report.md", "# Report"],
    ]),
  );
  const allPaths = [
    "framework/core/pack.yaml",
    "framework/core/assets/AGENTS.template.md",
    "framework/engineering/pack.yaml",
    "framework/engineering/assets/report.md",
  ];

  const files = await readPackAssetFiles(allPaths, source, [
    "core",
    "engineering",
  ]);
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "assets/AGENTS.template.md",
    "assets/report.md",
  ]);
});

Deno.test("readPackAssetFiles - returns empty for packs without assets", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/deno/skills/deno-cli/SKILL.md", "# Deno CLI"],
    ]),
  );
  const allPaths = [
    "framework/deno/pack.yaml",
    "framework/deno/skills/deno-cli/SKILL.md",
  ];

  const files = await readPackAssetFiles(allPaths, source, ["deno"]);
  assertEquals(files, []);
});

// --- FR-DIST.CODEX-AGENTS: end-to-end sync to Codex target ---

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

Deno.test("sync - codex target: writes sidecar TOML + [agents.<name>] block + manifest", async () => {
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

  // Manifest written
  const manifestText = await fs.readFile(
    "/project/.codex/flowai-agents.json",
  );
  const manifest = JSON.parse(manifestText);
  assertEquals(manifest.agents, ["flowai-console-expert"]);
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

// FR-DIST.CODEX-HOOKS — Experimental gate
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
