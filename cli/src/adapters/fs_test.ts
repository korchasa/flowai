import { assertEquals, assertRejects } from "@std/assert";
import { InMemoryFsAdapter } from "./fs.ts";

Deno.test("InMemoryFsAdapter - writeFile and readFile", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/tmp/test.txt", "hello");
  const content = await fs.readFile("/tmp/test.txt");
  assertEquals(content, "hello");
});

Deno.test("InMemoryFsAdapter - readFile throws on missing file", async () => {
  const fs = new InMemoryFsAdapter();
  await assertRejects(
    () => fs.readFile("/nonexistent"),
    Deno.errors.NotFound,
  );
});

Deno.test("InMemoryFsAdapter - exists", async () => {
  const fs = new InMemoryFsAdapter();
  assertEquals(await fs.exists("/tmp/test.txt"), false);
  await fs.writeFile("/tmp/test.txt", "hello");
  assertEquals(await fs.exists("/tmp/test.txt"), true);
});

Deno.test("InMemoryFsAdapter - mkdir and exists", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/tmp/dir");
  assertEquals(await fs.exists("/tmp/dir"), true);
});

Deno.test("InMemoryFsAdapter - readDir lists files and dirs", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/file.txt", "content");
  await fs.writeFile("/project/sub/nested.txt", "nested");

  const entries: Deno.DirEntry[] = [];
  for await (const entry of fs.readDir("/project")) {
    entries.push(entry);
  }

  const names = entries.map((e) => e.name).sort();
  assertEquals(names, ["file.txt", "sub"]);
});

Deno.test("InMemoryFsAdapter - symlink operations", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.symlink("AGENTS.md", "/project/CLAUDE.md");

  assertEquals(await fs.exists("/project/CLAUDE.md"), true);
  const target = await fs.readLink("/project/CLAUDE.md");
  assertEquals(target, "AGENTS.md");

  const info = await fs.stat("/project/CLAUDE.md");
  assertEquals(info.isSymlink, true);
});

Deno.test("InMemoryFsAdapter - remove", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/tmp/file.txt", "data");
  assertEquals(await fs.exists("/tmp/file.txt"), true);
  await fs.remove("/tmp/file.txt");
  assertEquals(await fs.exists("/tmp/file.txt"), false);
});
