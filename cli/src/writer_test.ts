import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { writeFiles } from "./writer.ts";
import type { PlanItem } from "./types.ts";

Deno.test("writeFiles - writes create and conflict items", async () => {
  const fs = new InMemoryFsAdapter();
  const plan: PlanItem[] = [
    {
      type: "skill",
      name: "a",
      action: "create",
      sourcePath: "a/SKILL.md",
      targetPath: "/out/a/SKILL.md",
      content: "# A",
    },
    {
      type: "skill",
      name: "b",
      action: "conflict",
      sourcePath: "b/SKILL.md",
      targetPath: "/out/b/SKILL.md",
      content: "# B",
    },
  ];

  const result = await writeFiles(plan, fs);
  assertEquals(result.written, 2);
  assertEquals(result.skipped, 0);
  assertEquals(await fs.readFile("/out/a/SKILL.md"), "# A");
  assertEquals(await fs.readFile("/out/b/SKILL.md"), "# B");
});

Deno.test("writeFiles - skips ok items", async () => {
  const fs = new InMemoryFsAdapter();
  const plan: PlanItem[] = [
    {
      type: "skill",
      name: "a",
      action: "ok",
      sourcePath: "a/SKILL.md",
      targetPath: "/out/a/SKILL.md",
      content: "# A",
    },
  ];

  const result = await writeFiles(plan, fs);
  assertEquals(result.written, 0);
  assertEquals(result.skipped, 1);
  assertEquals(await fs.exists("/out/a/SKILL.md"), false);
});
