import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { basename, dirname, join } from "@std/path";
import { createRunDir } from "./acceptance_runtime.ts";

// Two `deno task acceptance-tests` processes started in the same second used
// to land in one `runs/<ts>/` dir, and the second one's setupSandbox removed
// the first one's live sandbox (its external root is hashed from that path).
Deno.test("createRunDir - runs started in the same second get distinct dirs", async () => {
  const root = await Deno.makeTempDir({ prefix: "flowai-rundir-" });
  try {
    const now = () => new Date("2026-10-18T12:34:56.789Z");
    const [a, b, c] = await Promise.all([
      createRunDir({ root, now }),
      createRunDir({ root, now }),
      createRunDir({ root, now }),
    ]);
    const dirs = [a.runDir, b.runDir, c.runDir];
    assertEquals(new Set(dirs).size, 3, `run dirs collided: ${dirs}`);
    for (const dir of dirs) {
      assertEquals(dirname(dir), join(root, "acceptance-tests", "runs"));
      assert(basename(dir).startsWith("2026-10-18T12-34-56"), dir);
      assert((await Deno.stat(dir)).isDirectory, dir);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("createRunDir - an uncontended run keeps the plain timestamp name", async () => {
  const root = await Deno.makeTempDir({ prefix: "flowai-rundir-" });
  try {
    const now = () => new Date("2026-10-18T12:34:56.789Z");
    const { runDir } = await createRunDir({ root, now });
    assertEquals(basename(runDir), "2026-10-18T12-34-56");
    const second = await createRunDir({ root, now });
    assertNotEquals(second.runDir, runDir);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
