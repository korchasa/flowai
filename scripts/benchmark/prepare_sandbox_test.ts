import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import { ensureRepoCache } from "./prepare_sandbox.ts";

async function runGit(args: string[], cwd: string): Promise<void> {
  const { code, stderr } = await new Deno.Command("git", {
    args,
    cwd,
    stdout: "null",
    stderr: "piped",
  }).output();
  if (code !== 0) {
    throw new Error(
      `git ${args.join(" ")}: ${new TextDecoder().decode(stderr)}`,
    );
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Regression test for the parallel repo-cache race (FR-BENCH-SWE): two instances
 * of the SAME repo used to clone into one shared cache dir concurrently, leaving
 * a half-built cache so the loser's `git fetch` failed with "not our ref" and it
 * produced an empty patch. The fix serializes per-repo clone via a lock and
 * publishes atomically (clone into `.tmp` then rename), so concurrent callers
 * either build it once or hit the finished cache — never a partial one.
 */
Deno.test("ensureRepoCache: concurrent same-repo calls build one intact clone, no leftovers", async () => {
  const root = await Deno.makeTempDir({ prefix: "repo-cache-test-" });
  try {
    // A tiny local source repo to clone from (no network).
    const src = join(root, "src");
    await Deno.mkdir(src);
    await runGit(["init", "-q", "-b", "main"], src);
    await runGit(["config", "user.email", "t@example.com"], src);
    await runGit(["config", "user.name", "t"], src);
    await Deno.writeTextFile(join(src, "file.txt"), "hello");
    await runGit(["add", "."], src);
    await runGit(["commit", "-qm", "init"], src);

    const cacheRoot = join(root, "cache");
    // 6 concurrent callers race for the same repo cache.
    const dirs = await Promise.all(
      Array.from(
        { length: 6 },
        () => ensureRepoCache("acme/widget", cacheRoot, { cloneUrl: src }),
      ),
    );

    // All callers agree on the same cache dir.
    const dir = dirs[0];
    for (const d of dirs) assertEquals(d, dir);

    // The clone is intact (the race used to leave it half-built).
    assert(await exists(join(dir, ".git")), "cache must have .git");
    assertEquals(
      await Deno.readTextFile(join(dir, "file.txt")),
      "hello",
      "cloned content intact",
    );

    // No lock or temp artifacts left behind.
    assert(!(await exists(`${dir}.lock`)), "no .lock leftover");
    assert(!(await exists(`${dir}.tmp`)), "no .tmp leftover");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("ensureRepoCache: second call hits the cache fast-path (no re-clone)", async () => {
  const root = await Deno.makeTempDir({ prefix: "repo-cache-test-" });
  try {
    const src = join(root, "src");
    await Deno.mkdir(src);
    await runGit(["init", "-q", "-b", "main"], src);
    await runGit(["config", "user.email", "t@example.com"], src);
    await runGit(["config", "user.name", "t"], src);
    await Deno.writeTextFile(join(src, "file.txt"), "v1");
    await runGit(["add", "."], src);
    await runGit(["commit", "-qm", "init"], src);

    const cacheRoot = join(root, "cache");
    const first = await ensureRepoCache("acme/widget", cacheRoot, {
      cloneUrl: src,
    });
    // Mutate the cache; a fast-path second call must NOT overwrite it.
    await Deno.writeTextFile(join(first, "marker.txt"), "kept");
    const second = await ensureRepoCache("acme/widget", cacheRoot, {
      cloneUrl: src,
    });
    assertEquals(second, first);
    assert(
      await exists(join(second, "marker.txt")),
      "cache reused, not rebuilt",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
