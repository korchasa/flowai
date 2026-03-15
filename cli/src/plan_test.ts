import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { computePlan, filterActionable, planSummary } from "./plan.ts";

Deno.test("computePlan - creates new files", async () => {
  const fs = new InMemoryFsAdapter();
  const plan = await computePlan(
    [{ path: "my-skill/SKILL.md", content: "# Skill" }],
    "/project/.cursor/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].action, "create");
  assertEquals(plan[0].targetPath, "/project/.cursor/skills/my-skill/SKILL.md");
});

Deno.test("computePlan - ok when content matches", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/.cursor/skills/my-skill/SKILL.md", "# Skill");

  const plan = await computePlan(
    [{ path: "my-skill/SKILL.md", content: "# Skill" }],
    "/project/.cursor/skills",
    "skill",
    fs,
  );

  assertEquals(plan[0].action, "ok");
});

Deno.test("computePlan - conflict when content differs", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile(
    "/project/.cursor/skills/my-skill/SKILL.md",
    "# Modified locally",
  );

  const plan = await computePlan(
    [{ path: "my-skill/SKILL.md", content: "# Skill" }],
    "/project/.cursor/skills",
    "skill",
    fs,
  );

  assertEquals(plan[0].action, "conflict");
});

Deno.test("computePlan - agent type extracts name from .md", async () => {
  const fs = new InMemoryFsAdapter();
  const plan = await computePlan(
    [{ path: "my-agent.md", content: "# Agent" }],
    "/project/.cursor/agents",
    "agent",
    fs,
  );

  assertEquals(plan[0].name, "my-agent");
  assertEquals(plan[0].type, "agent");
});

Deno.test("filterActionable - excludes ok items", () => {
  const items = filterActionable([
    {
      type: "skill",
      name: "a",
      action: "ok",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
    {
      type: "skill",
      name: "b",
      action: "create",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
    {
      type: "skill",
      name: "c",
      action: "conflict",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
  ]);
  assertEquals(items.length, 2);
});

Deno.test("planSummary - counts actions", () => {
  const summary = planSummary([
    {
      type: "skill",
      name: "a",
      action: "create",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
    {
      type: "skill",
      name: "b",
      action: "create",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
    {
      type: "skill",
      name: "c",
      action: "ok",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
    {
      type: "skill",
      name: "d",
      action: "conflict",
      sourcePath: "",
      targetPath: "",
      content: "",
    },
  ]);
  assertEquals(summary.create, 2);
  assertEquals(summary.ok, 1);
  assertEquals(summary.conflict, 1);
  assertEquals(summary.update, 0);
});
