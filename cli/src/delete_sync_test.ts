import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { computeDeletePlan } from "./sync.ts";

Deno.test("computeDeletePlan - deletes excluded skill directory", async () => {
  const fs = new InMemoryFsAdapter();
  // Pre-existing skill directory
  fs.files.set("/project/.claude/skills/flowai-skill-foo/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/flowai-skill-foo");

  const plan = await computeDeletePlan(
    ["flowai-skill-foo", "flowai-skill-bar"],
    ["flowai-skill-bar"], // only bar included
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-skill-foo");
  assertEquals(plan[0].action, "delete");
  assertEquals(plan[0].targetPath, "/project/.claude/skills/flowai-skill-foo");
});

Deno.test("computeDeletePlan - deletes excluded agent file", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/agents/flowai-agent-foo.md", "content");

  const plan = await computeDeletePlan(
    ["flowai-agent-foo", "flowai-agent-bar"],
    ["flowai-agent-bar"],
    "/project/.claude/agents",
    "agent",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-agent-foo");
  assertEquals(plan[0].action, "delete");
  assertEquals(
    plan[0].targetPath,
    "/project/.claude/agents/flowai-agent-foo.md",
  );
});

Deno.test("computeDeletePlan - does not delete user resources", async () => {
  const fs = new InMemoryFsAdapter();
  // User resource not in framework bundle
  fs.files.set("/project/.claude/skills/my-custom-skill/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/my-custom-skill");

  const plan = await computeDeletePlan(
    ["flowai-skill-foo"], // bundle only has flowai-skill-foo
    [], // nothing included (empty = all included)
    "/project/.claude/skills",
    "skill",
    fs,
  );

  // No deletions — my-custom-skill is not in allFrameworkNames
  assertEquals(plan.length, 0);
});

Deno.test("computeDeletePlan - include mode deletes non-included framework resources", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/skills/flowai-skill-a/SKILL.md", "a");
  fs.dirs.add("/project/.claude/skills/flowai-skill-a");
  fs.files.set("/project/.claude/skills/flowai-skill-b/SKILL.md", "b");
  fs.dirs.add("/project/.claude/skills/flowai-skill-b");

  const plan = await computeDeletePlan(
    ["flowai-skill-a", "flowai-skill-b"],
    ["flowai-skill-a"], // only A included → B should be deleted
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-skill-b");
  assertEquals(plan[0].action, "delete");
});

Deno.test("computeDeletePlan - idempotent when resource does not exist locally", async () => {
  const fs = new InMemoryFsAdapter();
  // No pre-existing files

  const plan = await computeDeletePlan(
    ["flowai-skill-foo"],
    [], // all included, but foo excluded means includedNames would be empty only via exclude
    "/project/.claude/skills",
    "skill",
    fs,
  );

  // foo is in both all and included → not excluded → no deletion
  assertEquals(plan.length, 0);
});

Deno.test("computeDeletePlan - idempotent when excluded resource does not exist locally", async () => {
  const fs = new InMemoryFsAdapter();
  // No pre-existing files at all

  const plan = await computeDeletePlan(
    ["flowai-skill-foo", "flowai-skill-bar"],
    ["flowai-skill-bar"], // foo excluded but doesn't exist locally
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 0);
});

Deno.test("writeFiles - handles delete action", async () => {
  const { writeFiles } = await import("./writer.ts");
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/skills/flowai-skill-foo/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/flowai-skill-foo");

  const result = await writeFiles(
    [{
      type: "skill",
      name: "flowai-skill-foo",
      action: "delete",
      sourcePath: "",
      targetPath: "/project/.claude/skills/flowai-skill-foo",
      content: "",
    }],
    fs,
  );

  assertEquals(result.deleted, 1);
  assertEquals(result.written, 0);
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-skill-foo"),
    false,
  );
  assertEquals(
    await fs.exists("/project/.claude/skills/flowai-skill-foo/SKILL.md"),
    false,
  );
});

Deno.test("InMemoryFsAdapter.remove - recursive deletes directory contents", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/a/b/c.txt", "c");
  fs.files.set("/a/b/d.txt", "d");
  fs.dirs.add("/a/b");
  fs.dirs.add("/a");

  await fs.remove("/a/b");

  assertEquals(fs.files.has("/a/b/c.txt"), false);
  assertEquals(fs.files.has("/a/b/d.txt"), false);
  assertEquals(fs.dirs.has("/a/b"), false);
  assertEquals(fs.dirs.has("/a"), true); // parent untouched
});
