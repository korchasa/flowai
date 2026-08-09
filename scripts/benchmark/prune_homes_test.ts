import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  assertUnderRoot,
  BENCH_STORE_ROOT,
  listBenchRuns,
  pruneBenchRuns,
} from "./prune_homes.ts";

const DAY_MS = 86_400_000;

async function seedRun(
  root: string,
  name: string,
  ageDays: number,
): Promise<string> {
  const dir = join(root, "bench", name, ".codex", "sessions");
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, "rollout-a.jsonl"), "x".repeat(100));
  const when = new Date(Date.now() - ageDays * DAY_MS);
  await Deno.utime(join(root, "bench", name), when, when);
  return join(root, "bench", name);
}

Deno.test("BENCH_STORE_ROOT: the store root the bench writes to, under the real home", () => {
  assert(BENCH_STORE_ROOT.endsWith("/.flowai-dev"));
});

/**
 * The guard that makes a scripted `rm -rf` safe: a target that does not resolve
 * strictly under the root is refused, so a crafted or symlinked run name cannot
 * walk the deletion out of the store.
 */
Deno.test("assertUnderRoot: refuses a target outside the root, accepts one inside", () => {
  assertUnderRoot("/tmp/store", "/tmp/store/bench/run-1");
  let threw = false;
  try {
    assertUnderRoot("/tmp/store", "/tmp/store/../etc");
  } catch {
    threw = true;
  }
  assert(threw, "escaping target must be refused");
  threw = false;
  try {
    assertUnderRoot("/tmp/store", "/tmp/store");
  } catch {
    threw = true;
  }
  assert(threw, "the root itself is never a deletion target");
});

Deno.test("listBenchRuns: reports each run with its age and size, newest first", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    await seedRun(root, "old-run-aaa", 30);
    await seedRun(root, "fresh-run-bbb", 1);
    const runs = await listBenchRuns(root);
    assertEquals(runs.map((r) => r.name), ["fresh-run-bbb", "old-run-aaa"]);
    assertEquals(runs[0].bytes, 100);
    assert(runs[1].ageDays >= 29, `expected ~30 days, got ${runs[1].ageDays}`);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("listBenchRuns: an absent store is empty, not an error", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    assertEquals(await listBenchRuns(root), []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("pruneBenchRuns: dry run deletes nothing and still names the targets", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    const old = await seedRun(root, "old-run-aaa", 30);
    await seedRun(root, "fresh-run-bbb", 1);
    const plan = await pruneBenchRuns({ root, olderThanDays: 14 });
    assertEquals(plan.removed.map((r) => r.name), ["old-run-aaa"]);
    assertEquals(plan.kept.map((r) => r.name), ["fresh-run-bbb"]);
    assertEquals(plan.dryRun, true);
    assertEquals((await Deno.stat(old)).isDirectory, true, "nothing deleted");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("pruneBenchRuns: --yes removes only the runs past the age, keeps the root and auth", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    await Deno.writeTextFile(join(root, "auth.json"), "{}\n");
    const old = await seedRun(root, "old-run-aaa", 30);
    const fresh = await seedRun(root, "fresh-run-bbb", 1);
    const plan = await pruneBenchRuns({
      root,
      olderThanDays: 14,
      confirm: true,
    });
    assertEquals(plan.dryRun, false);
    assertEquals(plan.removed.map((r) => r.name), ["old-run-aaa"]);
    await assertRejects(() => Deno.stat(old));
    assertEquals((await Deno.stat(fresh)).isDirectory, true);
    assertEquals(await Deno.readTextFile(join(root, "auth.json")), "{}\n");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

/**
 * `olderThanDays: 0` means "everything", which is the one call that can wipe a
 * campaign's transcripts in a single command. It must still be an explicit
 * request, never something an unset flag falls into.
 */
Deno.test("pruneBenchRuns: age 0 takes every run, and only with confirmation", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    await seedRun(root, "fresh-run-bbb", 0);
    const dry = await pruneBenchRuns({ root, olderThanDays: 0 });
    assertEquals(dry.removed.map((r) => r.name), ["fresh-run-bbb"]);
    assertEquals(dry.dryRun, true);
    const done = await pruneBenchRuns({
      root,
      olderThanDays: 0,
      confirm: true,
    });
    assertEquals(done.removed.map((r) => r.name), ["fresh-run-bbb"]);
    assertEquals(await listBenchRuns(root), []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("pruneBenchRuns: a negative age is refused rather than treated as zero", async () => {
  const root = await Deno.makeTempDir({ prefix: "prune-test-" });
  try {
    await assertRejects(
      () => pruneBenchRuns({ root, olderThanDays: -1, confirm: true }),
      Error,
      "olderThanDays",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
