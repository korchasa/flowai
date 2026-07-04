import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { externalSandboxRoot, linkIntoRunDir } from "./sandbox_root.ts";

Deno.test("externalSandboxRoot: deterministic for the same outDir", async () => {
  const a = await externalSandboxRoot("/repo/scripts/benchmark/runs/x", {
    tmpBase: "/tmp",
    home: "/Users/dev",
  });
  const b = await externalSandboxRoot("/repo/scripts/benchmark/runs/x", {
    tmpBase: "/tmp",
    home: "/Users/dev",
  });
  assertEquals(a, b);
  assert(a.startsWith("/tmp/flowai-bench/"), `root under tmpBase: ${a}`);
  assert(a.includes("x-"), "slug keeps the run basename for readability");
});

Deno.test("externalSandboxRoot: distinct roots for same-basename outDirs", async () => {
  const a = await externalSandboxRoot("/repo1/runs/x", {
    tmpBase: "/tmp",
    home: "/Users/dev",
  });
  const b = await externalSandboxRoot("/repo2/runs/x", {
    tmpBase: "/tmp",
    home: "/Users/dev",
  });
  assert(a !== b, "different outDirs must not collide");
});

Deno.test("externalSandboxRoot: fails fast when the root would land under $HOME", async () => {
  // Ancestor memory files under $HOME are the exact contamination channel this
  // module exists to close — landing there must be an error, never a fallback.
  await assertRejects(
    () =>
      externalSandboxRoot("/repo/runs/x", {
        tmpBase: "/Users/dev/tmp",
        home: "/Users/dev",
      }),
    Error,
    "HOME",
  );
});

Deno.test("linkIntoRunDir: symlinks sandbox and bench-home into the run dir, idempotently", async () => {
  const instDir = await Deno.makeTempDir({ prefix: "link-inst-" });
  const extInstDir = await Deno.makeTempDir({ prefix: "link-ext-" });
  await Deno.mkdir(join(extInstDir, "sandbox"));
  await Deno.mkdir(join(extInstDir, "bench-home"));
  await Deno.writeTextFile(join(extInstDir, "sandbox", "marker.txt"), "hi");

  await linkIntoRunDir(instDir, extInstDir);
  // Idempotent: a resumed run re-links without error.
  await linkIntoRunDir(instDir, extInstDir);

  const viaLink = await Deno.readTextFile(
    join(instDir, "sandbox", "marker.txt"),
  );
  assertEquals(viaLink, "hi");
  const st = await Deno.lstat(join(instDir, "sandbox"));
  assert(st.isSymlink, "sandbox must be a symlink, not a copy");
  const home = await Deno.lstat(join(instDir, "bench-home"));
  assert(home.isSymlink, "bench-home must be a symlink");

  await Deno.remove(instDir, { recursive: true });
  await Deno.remove(extInstDir, { recursive: true });
});
