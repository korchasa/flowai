import { assertEquals } from "jsr:@std/assert@1";
import { buildContext, loadDocList, safeReadFile } from "./run.ts";

Deno.test("safeReadFile - returns content for existing file", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmp}/test.md`, "hello");
    const result = await safeReadFile(`${tmp}/test.md`);
    assertEquals(result, "hello");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("safeReadFile - returns null for missing file", async () => {
  const result = await safeReadFile("/tmp/nonexistent-file-abc123.md");
  assertEquals(result, null);
});

Deno.test("buildContext - all docs present", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmp}/a.md`, "content A");
    await Deno.writeTextFile(`${tmp}/b.md`, "content B");
    const result = await buildContext(tmp, ["a.md", "b.md"]);
    assertEquals(result, "--- a.md ---\ncontent A\n\n--- b.md ---\ncontent B");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("buildContext - some docs missing", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmp}/a.md`, "content A");
    const result = await buildContext(tmp, ["a.md", "missing.md"]);
    assertEquals(result, "--- a.md ---\ncontent A");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("buildContext - no docs found", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const result = await buildContext(tmp, ["missing.md"]);
    assertEquals(result, null);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("buildContext - empty list", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const result = await buildContext(tmp, []);
    assertEquals(result, null);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("buildContext - empty file included", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmp}/empty.md`, "");
    const result = await buildContext(tmp, ["empty.md"]);
    assertEquals(result, "--- empty.md ---\n");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("loadDocList - with sessionDocs in .flowai.yaml", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      `${tmp}/.flowai.yaml`,
      "version: '0.4'\nsessionDocs:\n  - docs/srs.md\n  - docs/sds.md\n",
    );
    const result = await loadDocList(tmp);
    assertEquals(result, ["docs/srs.md", "docs/sds.md"]);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("loadDocList - without sessionDocs field", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmp}/.flowai.yaml`, "version: '0.4'\n");
    const result = await loadDocList(tmp);
    assertEquals(result, []);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("loadDocList - invalid sessionDocs (not array)", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      `${tmp}/.flowai.yaml`,
      "version: '0.4'\nsessionDocs: not-an-array\n",
    );
    const result = await loadDocList(tmp);
    assertEquals(result, []);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("loadDocList - no .flowai.yaml", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const result = await loadDocList(tmp);
    assertEquals(result, []);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
