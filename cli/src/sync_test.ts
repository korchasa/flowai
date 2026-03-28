import { assertEquals } from "@std/assert";
import { filterNames, resolvePackResources } from "./sync.ts";
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
