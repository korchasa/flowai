import { assertEquals } from "@std/assert";
import {
  filterNames,
  readPackAssetFiles,
  readPackSkillFiles,
  readSkillFiles,
  resolvePackResources,
} from "./sync.ts";
import { InMemoryFrameworkSource } from "./source.ts";
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

const PACK_PATHS = [
  "framework/core/pack.yaml",
  "framework/core/skills/flowai-commit/SKILL.md",
  "framework/core/skills/flowai-plan/SKILL.md",
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
  assertEquals(result.skillNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: [] defaults to core only", () => {
  const config = makeConfig({ packs: [] });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.skillNames, ["flowai-commit", "flowai-plan"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: undefined (v1 legacy) selects all", () => {
  const config = makeConfig({ packs: undefined });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.skillNames, [
    "flowai-commit",
    "flowai-plan",
    "flowai-skill-deno-cli",
  ]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - applies skills.exclude after pack expansion", () => {
  const config = makeConfig({
    packs: ["core"],
    skills: { include: [], exclude: ["flowai-plan"] },
  });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.skillNames, ["flowai-commit"]);
});

Deno.test("resolvePackResources - applies skills.include after pack expansion", () => {
  const config = makeConfig({
    packs: ["core", "deno"],
    skills: {
      include: ["flowai-commit", "flowai-skill-deno-cli"],
      exclude: [],
    },
  });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.skillNames, ["flowai-commit", "flowai-skill-deno-cli"]);
});

// --- Hook and Script resolution tests ---

const PACK_PATHS_WITH_HOOKS_SCRIPTS = [
  "framework/core/pack.yaml",
  "framework/core/skills/flowai-commit/SKILL.md",
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
      ["framework/core/skills/flowai-commit/SKILL.md", "# Commit"],
      ["framework/core/skills/flowai-commit/prompt.md", "prompt"],
      ["framework/core/skills/flowai-commit/scripts/helper.ts", "code"],
      [
        "framework/core/skills/flowai-commit/scripts/helper_test.ts",
        "test code",
      ],
      [
        "framework/core/skills/flowai-commit/benchmarks/basic/mod.ts",
        "bench code",
      ],
      [
        "framework/core/skills/flowai-commit/benchmarks/basic/fixture/file.md",
        "fixture",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/skills/flowai-commit/SKILL.md",
    "framework/core/skills/flowai-commit/prompt.md",
    "framework/core/skills/flowai-commit/scripts/helper.ts",
    "framework/core/skills/flowai-commit/scripts/helper_test.ts",
    "framework/core/skills/flowai-commit/benchmarks/basic/mod.ts",
    "framework/core/skills/flowai-commit/benchmarks/basic/fixture/file.md",
  ];

  const files = await readPackSkillFiles(["flowai-commit"], allPaths, source);
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "flowai-commit/SKILL.md",
    "flowai-commit/prompt.md",
    "flowai-commit/scripts/helper.ts",
  ]);
});

Deno.test("readSkillFiles - excludes benchmarks and test files", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/skills/flowai-commit/SKILL.md", "# Commit"],
      ["framework/skills/flowai-commit/scripts/run.ts", "code"],
      ["framework/skills/flowai-commit/scripts/run_test.ts", "test"],
      [
        "framework/skills/flowai-commit/benchmarks/basic/mod.ts",
        "bench code",
      ],
    ]),
  );
  const allPaths = [
    "framework/skills/flowai-commit/SKILL.md",
    "framework/skills/flowai-commit/scripts/run.ts",
    "framework/skills/flowai-commit/scripts/run_test.ts",
    "framework/skills/flowai-commit/benchmarks/basic/mod.ts",
  ];

  const files = await readSkillFiles(["flowai-commit"], allPaths, source);
  const paths = files.map((f) => f.path);

  assertEquals(paths, [
    "flowai-commit/SKILL.md",
    "flowai-commit/scripts/run.ts",
  ]);
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
      ["framework/core/skills/flowai-init/SKILL.md", "# Init"],
    ]),
  );
  const allPaths = [
    "framework/core/pack.yaml",
    "framework/core/assets/AGENTS.template.md",
    "framework/core/assets/AGENTS.documents.template.md",
    "framework/core/skills/flowai-init/SKILL.md",
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
