import { assertEquals, assertRejects } from "@std/assert";
import {
  BundledSource,
  extractAgentNames,
  extractCommandNames,
  extractPackAgentNames,
  extractPackAssetPaths,
  extractPackCommandNames,
  extractPackHookNames,
  extractPackNames,
  extractPackScriptNames,
  extractPackSkillNames,
  extractSkillNames,
  GitSource,
  hasPacks,
  InMemoryFrameworkSource,
  LocalSource,
} from "./source.ts";

Deno.test("BundledSource - listFiles filters by prefix", async () => {
  const source = new BundledSource({
    "framework/skills/foo/SKILL.md": "# Foo",
    "framework/skills/bar/SKILL.md": "# Bar",
    "framework/agents/a.md": "# Agent",
    "README.md": "# Readme",
  });

  const skillFiles = await source.listFiles("framework/skills/");
  assertEquals(skillFiles, [
    "framework/skills/bar/SKILL.md",
    "framework/skills/foo/SKILL.md",
  ]);

  const agentFiles = await source.listFiles("framework/agents/");
  assertEquals(agentFiles, ["framework/agents/a.md"]);
});

Deno.test("BundledSource - readFile returns content", async () => {
  const source = new BundledSource({
    "framework/skills/foo/SKILL.md": "# Foo Skill",
  });
  assertEquals(
    await source.readFile("framework/skills/foo/SKILL.md"),
    "# Foo Skill",
  );
});

Deno.test("BundledSource - readFile throws on missing", async () => {
  const source = new BundledSource({});
  await assertRejects(
    () => source.readFile("nonexistent.md"),
    Error,
    "Not found in bundle: nonexistent.md",
  );
});

Deno.test("BundledSource.load - reads real bundled.json", async () => {
  const source = await BundledSource.load();
  const files = await source.listFiles("framework/");
  // Should find at least some files from the real bundle (pack structure)
  assertEquals(files.length > 0, true);

  const content = await source.readFile(files[0]);
  assertEquals(content.length > 0, true);
  await source.dispose();
});

Deno.test("InMemoryFrameworkSource - listFiles filters by prefix", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([
      ["framework/skills/foo/SKILL.md", "# Foo"],
      ["framework/skills/bar/SKILL.md", "# Bar"],
      ["framework/agents/a.md", "# Agent"],
      ["README.md", "# Readme"],
    ]),
  );

  const skillFiles = await source.listFiles("framework/skills/");
  assertEquals(skillFiles, [
    "framework/skills/bar/SKILL.md",
    "framework/skills/foo/SKILL.md",
  ]);

  const agentFiles = await source.listFiles("framework/agents/");
  assertEquals(agentFiles, ["framework/agents/a.md"]);
});

Deno.test("InMemoryFrameworkSource - readFile returns content", async () => {
  const source = new InMemoryFrameworkSource(
    new Map([["framework/skills/foo/SKILL.md", "# Foo Skill"]]),
  );
  assertEquals(
    await source.readFile("framework/skills/foo/SKILL.md"),
    "# Foo Skill",
  );
});

Deno.test("InMemoryFrameworkSource - readFile throws on missing", async () => {
  const source = new InMemoryFrameworkSource(new Map());
  await assertRejects(
    () => source.readFile("nonexistent.md"),
    Error,
    "File not found: nonexistent.md",
  );
});

Deno.test("extractSkillNames - extracts unique skill names from paths", () => {
  const paths = [
    "framework/skills/foo/SKILL.md",
    "framework/skills/foo/refs/a.md",
    "framework/skills/bar/SKILL.md",
  ];
  assertEquals(extractSkillNames(paths), ["bar", "foo"]);
});

Deno.test("extractAgentNames - extracts agent names from flat structure", () => {
  const paths = [
    "framework/agents/agent1.md",
    "framework/agents/agent2.md",
    "framework/skills/foo/SKILL.md",
  ];
  assertEquals(extractAgentNames(paths), ["agent1", "agent2"]);
});

Deno.test("extractAgentNames - ignores nested paths", () => {
  const paths = [
    "framework/agents/agent1.md",
    "framework/agents/subdir/agent2.md",
  ];
  assertEquals(extractAgentNames(paths), ["agent1"]);
});

// --- Pack-aware extractor tests ---

Deno.test("extractPackNames - extracts pack names from pack.yaml paths", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/skills/commit/SKILL.md",
    "framework/engineering/pack.yaml",
    "framework/engineering/skills/write-dep/SKILL.md",
    "framework/skills/old-skill/SKILL.md",
  ];
  assertEquals(extractPackNames(paths), ["core", "engineering"]);
});

Deno.test("extractPackNames - returns empty for legacy structure", () => {
  const paths = [
    "framework/skills/foo/SKILL.md",
    "framework/agents/bar.md",
  ];
  assertEquals(extractPackNames(paths), []);
});

Deno.test("extractPackSkillNames - extracts skills within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/skills/commit/SKILL.md",
    "framework/core/skills/commit/refs/a.md",
    "framework/core/skills/plan/SKILL.md",
    "framework/engineering/skills/write-dep/SKILL.md",
  ];
  assertEquals(extractPackSkillNames(paths, "core"), ["commit", "plan"]);
  assertEquals(extractPackSkillNames(paths, "engineering"), ["write-dep"]);
  assertEquals(extractPackSkillNames(paths, "nonexistent"), []);
});

Deno.test("extractPackSkillNames - ignores commands/ subtree", () => {
  const paths = [
    "framework/core/skills/flowai-skill-foo/SKILL.md",
    "framework/core/commands/flowai-bar/SKILL.md",
    "framework/core/commands/flowai-baz/SKILL.md",
  ];
  assertEquals(extractPackSkillNames(paths, "core"), ["flowai-skill-foo"]);
});

Deno.test("extractPackCommandNames - extracts commands within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/commands/flowai-commit/SKILL.md",
    "framework/core/commands/flowai-commit/scripts/helper.ts",
    "framework/core/commands/flowai-review-and-commit/SKILL.md",
    "framework/core/skills/flowai-skill-foo/SKILL.md",
    "framework/typescript/commands/flowai-bar/SKILL.md",
  ];
  assertEquals(
    extractPackCommandNames(paths, "core"),
    ["flowai-commit", "flowai-review-and-commit"],
  );
  assertEquals(
    extractPackCommandNames(paths, "typescript"),
    ["flowai-bar"],
  );
  assertEquals(extractPackCommandNames(paths, "nonexistent"), []);
});

Deno.test("extractPackCommandNames - ignores skills/ subtree", () => {
  const paths = [
    "framework/core/skills/flowai-skill-foo/SKILL.md",
    "framework/core/commands/flowai-bar/SKILL.md",
  ];
  assertEquals(extractPackCommandNames(paths, "core"), ["flowai-bar"]);
});

Deno.test("extractCommandNames - extracts unique command names (legacy flat)", () => {
  const paths = [
    "framework/commands/flowai-commit/SKILL.md",
    "framework/commands/flowai-commit/refs/a.md",
    "framework/commands/flowai-skill-plan/SKILL.md",
    "framework/skills/flowai-skill-foo/SKILL.md",
  ];
  assertEquals(extractCommandNames(paths), [
    "flowai-commit",
    "flowai-skill-plan",
  ]);
});

Deno.test("extractPackAgentNames - extracts agents within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/agents/diff-specialist.md",
    "framework/core/agents/console-expert.md",
    "framework/core/skills/commit/SKILL.md",
    "framework/engineering/agents/flowai-deep-research-worker.md",
  ];
  assertEquals(
    extractPackAgentNames(paths, "core"),
    ["console-expert", "diff-specialist"],
  );
  assertEquals(
    extractPackAgentNames(paths, "engineering"),
    ["flowai-deep-research-worker"],
  );
});

Deno.test("extractPackAgentNames - ignores nested agent dirs", () => {
  const paths = [
    "framework/core/agents/valid.md",
    "framework/core/agents/subdir/invalid.md",
  ];
  assertEquals(extractPackAgentNames(paths, "core"), ["valid"]);
});

Deno.test("hasPacks - true when framework/ exists", () => {
  assertEquals(
    hasPacks(["framework/core/pack.yaml"]),
    true,
  );
});

Deno.test("hasPacks - false for legacy structure", () => {
  assertEquals(
    hasPacks(["framework/skills/foo/SKILL.md", "framework/agents/bar.md"]),
    false,
  );
});

// --- Hook and Script extractor tests ---

Deno.test("extractPackHookNames - extracts hooks within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/hooks/lint-on-edit/hook.yaml",
    "framework/core/hooks/lint-on-edit/run.ts",
    "framework/core/hooks/format-on-save/hook.yaml",
    "framework/core/hooks/format-on-save/run.ts",
    "framework/core/skills/commit/SKILL.md",
  ];
  assertEquals(
    extractPackHookNames(paths, "core"),
    ["format-on-save", "lint-on-edit"],
  );
  assertEquals(extractPackHookNames(paths, "nonexistent"), []);
});

Deno.test("extractPackScriptNames - extracts scripts within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/scripts/check.ts",
    "framework/core/scripts/validate.ts",
    "framework/core/skills/commit/SKILL.md",
  ];
  assertEquals(
    extractPackScriptNames(paths, "core"),
    ["check.ts", "validate.ts"],
  );
  assertEquals(extractPackScriptNames(paths, "nonexistent"), []);
});

// --- Pack asset extractor tests ---

Deno.test("extractPackAssetPaths - extracts asset paths within a pack", () => {
  const paths = [
    "framework/core/pack.yaml",
    "framework/core/assets/AGENTS.template.md",
    "framework/core/assets/AGENTS.documents.template.md",
    "framework/core/commands/flowai-init/SKILL.md",
    "framework/engineering/assets/report.md",
  ];
  assertEquals(
    extractPackAssetPaths(paths, "core"),
    [
      "framework/core/assets/AGENTS.documents.template.md",
      "framework/core/assets/AGENTS.template.md",
    ],
  );
  assertEquals(
    extractPackAssetPaths(paths, "engineering"),
    ["framework/engineering/assets/report.md"],
  );
  assertEquals(extractPackAssetPaths(paths, "nonexistent"), []);
});

Deno.test("extractPackScriptNames - ignores subdirectories", () => {
  const paths = [
    "framework/core/scripts/check.ts",
    "framework/core/scripts/lib/helper.ts",
  ];
  assertEquals(extractPackScriptNames(paths, "core"), ["check.ts"]);
});

// --- LocalSource tests ---

Deno.test("LocalSource - listFiles returns framework/ files", async () => {
  // Uses the real framework/ directory in this repo
  const rootDir = new URL("../../", import.meta.url).pathname;
  const source = new LocalSource(rootDir + "framework");

  const files = await source.listFiles("framework/");
  assertEquals(files.length > 0, true);

  // Should contain known files
  const hasPackYaml = files.some((f) => f === "framework/core/pack.yaml");
  assertEquals(hasPackYaml, true);

  // Should exclude acceptance-tests
  const hasBenchmark = files.some((f) => /\/acceptance-tests\//.test(f));
  assertEquals(hasBenchmark, false);

  // Should exclude test files
  const hasTestFile = files.some((f) => /_test\.\w+$/.test(f));
  assertEquals(hasTestFile, false);

  await source.dispose();
});

Deno.test("LocalSource - listFiles filters by prefix", async () => {
  const rootDir = new URL("../../", import.meta.url).pathname;
  const source = new LocalSource(rootDir + "framework");

  const coreSkills = await source.listFiles("framework/core/skills/");
  assertEquals(coreSkills.length > 0, true);
  for (const f of coreSkills) {
    assertEquals(f.startsWith("framework/core/skills/"), true);
  }

  await source.dispose();
});

Deno.test("LocalSource - readFile returns content", async () => {
  const rootDir = new URL("../../", import.meta.url).pathname;
  const source = new LocalSource(rootDir + "framework");

  const content = await source.readFile("framework/core/pack.yaml");
  assertEquals(content.includes("name: core"), true);

  await source.dispose();
});

Deno.test("LocalSource - readFile throws on missing", async () => {
  const rootDir = new URL("../../", import.meta.url).pathname;
  const source = new LocalSource(rootDir + "framework");

  await assertRejects(
    () => source.readFile("framework/nonexistent.md"),
    Error,
  );

  await source.dispose();
});

// --- GitSource tests ---

Deno.test("GitSource - clone from real repo (main branch)", async () => {
  const source = await GitSource.clone("main");

  const files = await source.listFiles("framework/");
  assertEquals(files.length > 0, true);

  const hasPackYaml = files.some((f) => f === "framework/core/pack.yaml");
  assertEquals(hasPackYaml, true);

  const content = await source.readFile("framework/core/pack.yaml");
  assertEquals(content.includes("name: core"), true);

  await source.dispose();
});

Deno.test("GitSource - clone with custom git URL", async () => {
  // Use the same official repo URL as explicit override
  const source = await GitSource.clone(
    "main",
    "https://github.com/korchasa/flowai.git",
  );

  const files = await source.listFiles("framework/");
  assertEquals(files.length > 0, true);

  await source.dispose();
});

Deno.test("GitSource - clone fails on nonexistent ref", async () => {
  await assertRejects(
    () => GitSource.clone("nonexistent-branch-xyz-12345"),
    Error,
    "Failed to clone",
  );
});

Deno.test("GitSource - clone fails on invalid URL", async () => {
  await assertRejects(
    () =>
      GitSource.clone(
        "main",
        "https://github.com/nonexistent-user-xyz/nonexistent-repo-xyz.git",
      ),
    Error,
    "Failed to clone",
  );
});
