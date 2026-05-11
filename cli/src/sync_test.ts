import { assertEquals } from "@std/assert";
import {
  filterNames,
  injectDisableModelInvocation,
  readCommandFiles,
  readPackAssetFiles,
  readPackCommandFiles,
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

// Mixed pack structure: commands under commands/, skills under skills/.
// Mirrors the canonical framework layout after the commands/skills split.
const PACK_PATHS = [
  "framework/core/pack.yaml",
  "framework/core/commands/flowai-commit/SKILL.md",
  "framework/core/skills/flowai-skill-plan/SKILL.md",
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
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.skillNames, ["flowai-skill-plan"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: [] defaults to core only", () => {
  const config = makeConfig({ packs: [] });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.skillNames, ["flowai-skill-plan"]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - packs: undefined (v1 legacy) selects all", () => {
  const config = makeConfig({ packs: undefined });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.skillNames, [
    "flowai-skill-deno-cli",
    "flowai-skill-plan",
  ]);
  assertEquals(result.agentNames, ["flowai-console-expert"]);
});

Deno.test("resolvePackResources - applies commands.exclude after pack expansion", () => {
  const config = makeConfig({
    packs: ["core"],
    commands: { include: [], exclude: ["flowai-commit"] },
  });
  const result = resolvePackResources(PACK_PATHS, config);
  assertEquals(result.commandNames, []);
  assertEquals(result.skillNames, ["flowai-skill-plan"]);
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

// --- Dev-only file exclusion tests (acceptance-tests + tests) ---

Deno.test("readPackSkillFiles - excludes acceptance-tests and test files", async () => {
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
        "framework/core/skills/flowai-skill-demo/acceptance-tests/basic/mod.ts",
        "bench code",
      ],
      [
        "framework/core/skills/flowai-skill-demo/acceptance-tests/basic/fixture/file.md",
        "fixture",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/skills/flowai-skill-demo/SKILL.md",
    "framework/core/skills/flowai-skill-demo/prompt.md",
    "framework/core/skills/flowai-skill-demo/scripts/helper.ts",
    "framework/core/skills/flowai-skill-demo/scripts/helper_test.ts",
    "framework/core/skills/flowai-skill-demo/acceptance-tests/basic/mod.ts",
    "framework/core/skills/flowai-skill-demo/acceptance-tests/basic/fixture/file.md",
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

Deno.test("readSkillFiles - excludes acceptance-tests and test files", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/skills/flowai-skill-demo/SKILL.md", "# Demo"],
      ["framework/skills/flowai-skill-demo/scripts/run.ts", "code"],
      ["framework/skills/flowai-skill-demo/scripts/run_test.ts", "test"],
      [
        "framework/skills/flowai-skill-demo/acceptance-tests/basic/mod.ts",
        "bench code",
      ],
    ]),
  );
  const allPaths = [
    "framework/skills/flowai-skill-demo/SKILL.md",
    "framework/skills/flowai-skill-demo/scripts/run.ts",
    "framework/skills/flowai-skill-demo/scripts/run_test.ts",
    "framework/skills/flowai-skill-demo/acceptance-tests/basic/mod.ts",
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
        "framework/core/commands/flowai-commit/acceptance-tests/basic/mod.ts",
        "bench",
      ],
    ]),
  );
  const allPaths = [
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-commit/scripts/helper.ts",
    "framework/core/commands/flowai-commit/scripts/helper_test.ts",
    "framework/core/commands/flowai-commit/acceptance-tests/basic/mod.ts",
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

Deno.test("readPackSkillFiles - does NOT inject disable-model-invocation into skills/", async () => {
  // Regression guard for the commands->skills migration: the 10 primitives
  // moved to framework/<pack>/skills/flowai-skill-*/ must install WITHOUT
  // `disable-model-invocation: true`, so the model can auto-invoke them.
  // The CLI writer injects the flag only for commands/; skills/ stays clean.
  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/skills/flowai-skill-plan/SKILL.md",
        "---\nname: flowai-skill-plan\ndescription: Use when planning.\n---\n\n# Body\n",
      ],
    ]),
  );
  const allPaths = ["framework/core/skills/flowai-skill-plan/SKILL.md"];
  const files = await readPackSkillFiles(
    ["flowai-skill-plan"],
    allPaths,
    source,
  );
  const skillMd = files.find((f) => f.path === "flowai-skill-plan/SKILL.md");
  assertEquals(skillMd !== undefined, true);
  assertEquals(
    /disable-model-invocation/.test(skillMd!.content),
    false,
    "skills/ MUST NOT carry disable-model-invocation — only commands/ get it",
  );
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
        "framework/commands/flowai-commit/acceptance-tests/basic/mod.ts",
        "bench",
      ],
    ]),
  );
  const allPaths = [
    "framework/commands/flowai-commit/SKILL.md",
    "framework/commands/flowai-commit/acceptance-tests/basic/mod.ts",
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
    "framework/core/commands/flowai-review-and-commit/SKILL.md",
    "framework/core/skills/flowai-skill-foo/SKILL.md",
  ];
  const config = makeConfig({ packs: ["core"] });
  const result = resolvePackResources(paths, config);
  assertEquals(result.skillNames, ["flowai-skill-foo"]);
  assertEquals(result.commandNames, [
    "flowai-commit",
    "flowai-review-and-commit",
  ]);
  assertEquals(
    result.allCommandNames,
    ["flowai-commit", "flowai-review-and-commit"],
  );
});

Deno.test("resolvePackResources - applies commands.exclude after pack expansion", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-skill-plan/SKILL.md",
  ];
  const config = makeConfig({
    packs: ["core"],
    commands: { include: [], exclude: ["flowai-skill-plan"] },
  });
  const result = resolvePackResources(paths, config);
  assertEquals(result.commandNames, ["flowai-commit"]);
  assertEquals(result.allCommandNames, ["flowai-commit", "flowai-skill-plan"]);
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
