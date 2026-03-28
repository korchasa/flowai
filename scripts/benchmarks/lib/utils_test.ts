import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { writeRunFile } from "./utils.ts";

Deno.test("writeRunFile writes content and returns path", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const path = await writeRunFile(dir, "test-output.md", "hello world");
    assertEquals(path, join(dir, "test-output.md"));
    const content = await Deno.readTextFile(path);
    assertEquals(content, "hello world");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("writeRunFile overwrites existing file", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await writeRunFile(dir, "out.md", "first");
    const path = await writeRunFile(dir, "out.md", "second");
    const content = await Deno.readTextFile(path);
    assertEquals(content, "second");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
