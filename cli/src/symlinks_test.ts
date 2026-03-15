import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { syncClaudeSymlinks } from "./symlinks.ts";

Deno.test("syncClaudeSymlinks - creates symlink where AGENTS.md exists", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/AGENTS.md", "# Agents");

  const result = await syncClaudeSymlinks("/project", fs);
  assertEquals(result.created.length, 1);
  assertEquals(result.created[0], "/project/CLAUDE.md");
  assertEquals(await fs.readLink("/project/CLAUDE.md"), "AGENTS.md");
});

Deno.test("syncClaudeSymlinks - skips when CLAUDE.md is regular file", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/AGENTS.md", "# Agents");
  await fs.writeFile("/project/CLAUDE.md", "# Custom Claude");

  const result = await syncClaudeSymlinks("/project", fs);
  assertEquals(result.skipped.length, 1);
  assertEquals(result.created.length, 0);
});

Deno.test("syncClaudeSymlinks - updates symlink pointing elsewhere", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/AGENTS.md", "# Agents");
  await fs.symlink("OTHER.md", "/project/CLAUDE.md");

  const result = await syncClaudeSymlinks("/project", fs);
  assertEquals(result.updated.length, 1);
  assertEquals(await fs.readLink("/project/CLAUDE.md"), "AGENTS.md");
});

Deno.test("syncClaudeSymlinks - handles subdirectories", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/AGENTS.md", "# Root");
  await fs.writeFile("/project/sub/AGENTS.md", "# Sub");

  const result = await syncClaudeSymlinks("/project", fs);
  assertEquals(result.created.length, 2);
});

Deno.test("syncClaudeSymlinks - no AGENTS.md means no symlinks", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/project/README.md", "# Readme");

  const result = await syncClaudeSymlinks("/project", fs);
  assertEquals(result.created.length, 0);
  assertEquals(result.skipped.length, 0);
});
