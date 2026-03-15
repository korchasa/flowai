import { assertEquals, assertRejects } from "@std/assert";
import {
  BundledSource,
  extractAgentNames,
  extractSkillNames,
  InMemoryFrameworkSource,
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
  const files = await source.listFiles("framework/skills/");
  // Should find at least some skill files from the real bundle
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
