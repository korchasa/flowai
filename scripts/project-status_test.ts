import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

const SCRIPTS = dirname(fromFileUrl(import.meta.url));

/** Builds a throwaway project root the status script resolves as its own. */
async function fakeRoot(cell: unknown): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "project-status-" });
  const cellDir = join(root, "scripts", "benchmark", "cells", "c1");
  await Deno.mkdir(cellDir, { recursive: true });
  await Deno.mkdir(join(root, "documents", "tasks"), { recursive: true });
  await Deno.mkdir(join(root, "acceptance-tests", "cache"), {
    recursive: true,
  });
  for (const name of ["project-status.py", "tasks-overview.py"]) {
    await Deno.copyFile(join(SCRIPTS, name), join(root, "scripts", name));
  }
  await Deno.writeTextFile(join(cellDir, "cell.json"), JSON.stringify(cell));
  return root;
}

Deno.test("project-status reports a cell whose rep is still running", async () => {
  // `deno task benchmark` writes `finishedAt: null` when a rep starts and
  // fills it in only when the rep ends.
  const root = await fakeRoot({
    key: { arm: "flowai", ide: "codex", model: "m", effort: "medium" },
    reps: [
      {
        rep: 1,
        startedAt: "2026-10-01T00:00:00Z",
        finishedAt: "2026-10-02T00:00:00Z",
      },
      { rep: 2, startedAt: "2026-10-10T00:00:00Z", finishedAt: null },
    ],
  });
  try {
    const out = await new Deno.Command("python3", {
      args: [join(root, "scripts", "project-status.py")],
      stdout: "piped",
      stderr: "piped",
    }).output();
    const stderr = new TextDecoder().decode(out.stderr);
    assertEquals(out.code, 0, stderr);
    assertStringIncludes(
      new TextDecoder().decode(out.stdout),
      "last rep 2026-10-02",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
