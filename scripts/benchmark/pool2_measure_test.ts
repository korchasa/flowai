import { assert, assertEquals } from "@std/assert";
import {
  campaignMismatch,
  campaignRunId,
  isHealthAbort,
  mapPool,
  pendingIds,
} from "./pool2_measure.ts";

/**
 * swebench caches a graded verdict under `logs/run_evaluation/<runId>/<model>/
 * <instance>/report.json` and SKIPS any instance already there ("N instances
 * already run, skipping..."). The run id must therefore carry the campaign:
 * with a rep-only id, the codex campaign inherited 64 of 67 verdicts from the
 * Sonnet campaign that graded under the same id — a headroom number that
 * measured the wrong agent (measured 2026-07-25).
 */
Deno.test("campaignRunId: each campaign grades under its own id", () => {
  const terra = { ide: "codex", model: "gpt-5.6-terra", effort: "medium" };
  const id = campaignRunId(terra, 1);
  assertEquals(id, "pool2-codex-gpt-5-6-terra-medium-rep1");

  // Every pin, and the rep, must move the id.
  const differs = [
    campaignRunId({ ...terra, model: "gpt-5.6-sol" }, 1),
    campaignRunId({ ...terra, effort: "high" }, 1),
    campaignRunId({ ...terra, ide: "claude" }, 1),
    campaignRunId(terra, 2),
  ];
  assertEquals(new Set([id, ...differs]).size, 5, "ids must all be distinct");
  // Docker/swebench path segment: no dots or slashes survive.
  for (const v of [id, ...differs]) assertEquals(/^[a-z0-9-]+$/.test(v), true);

  // The original claude/sonnet@high campaign keeps its historical id — its
  // graded logs on disk (and the pool2 freeze derived from them) live there.
  assertEquals(
    campaignRunId({ ide: "claude", model: "sonnet", effort: "high" }, 3),
    "pool2-baseline-rep3",
  );
  assertEquals(
    campaignRunId({ model: "sonnet", effort: "high" }, 1),
    "pool2-baseline-rep1",
    "legacy reps carry no ide field and were all Claude",
  );
});

/**
 * A rep dir is owned by exactly ONE campaign. `runBaselineBatch` resumes by
 * reading the ids already in `baseline.jsonl`, so pointing a second campaign at
 * another's dir does not error — it reports "0 pending" and silently adopts the
 * first campaign's predictions as its own. That is the same class of failure as
 * banking a never-attempted instance as a miss, so it must abort loudly.
 */
Deno.test("campaignMismatch: a rep dir belongs to one campaign", () => {
  const codex = { ide: "codex", model: "gpt-5.6-terra", effort: "medium" };
  // Fresh dir → nothing to conflict with.
  assertEquals(campaignMismatch(null, codex), null);
  // Same campaign resuming → allowed (that is the whole point of resume).
  assertEquals(campaignMismatch({ ...codex }, codex), null);

  // Any pin differing means the predictions in that dir are someone else's.
  assert(campaignMismatch({ ...codex, model: "gpt-5.6-sol" }, codex));
  assert(campaignMismatch({ ...codex, effort: "high" }, codex));
  assert(campaignMismatch({ ...codex, ide: "claude" }, codex));

  // Legacy reps predate the `ide` field and were all Claude runs; treat a
  // missing ide as claude rather than as "matches anything".
  const legacySonnet = { model: "sonnet", effort: "high" };
  assertEquals(
    campaignMismatch(legacySonnet, {
      ide: "claude",
      model: "sonnet",
      effort: "high",
    }),
    null,
  );
  assert(
    campaignMismatch(legacySonnet, codex),
    "a codex run must not adopt the legacy Sonnet rep dir",
  );
});

Deno.test("pendingIds: keeps only ids not already done (resume after a kill)", () => {
  assertEquals(
    pendingIds(["a", "b", "c", "d"], new Set(["b", "d"])),
    ["a", "c"],
  );
  assertEquals(pendingIds(["a", "b"], new Set(["a", "b"])), []);
  assertEquals(pendingIds([], new Set(["a"])), []);
});

Deno.test("mapPool: preserves input order in results", async () => {
  const out = await mapPool(
    [10, 20, 30, 40, 50],
    2,
    (n) => Promise.resolve(n * 2),
  );
  assertEquals(out, [20, 40, 60, 80, 100]);
});

Deno.test("mapPool: never exceeds the concurrency cap", async () => {
  let inFlight = 0;
  let peak = 0;
  await mapPool(Array.from({ length: 12 }, (_, i) => i), 3, async (n) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return n;
  });
  assert(peak <= 3, `peak concurrency ${peak} exceeded cap 3`);
  assert(peak >= 2, `pool did not run concurrently (peak ${peak})`);
});

Deno.test("mapPool: a rejecting task does not sink the whole batch when wrapped", async () => {
  // The batch runner wraps each task so one failure yields a sentinel, not a
  // throw — mirrors runBaselineBatch's per-instance try/catch contract.
  const out = await mapPool(
    [1, 2, 3],
    2,
    (n) =>
      n === 2
        ? Promise.reject(new Error("boom")).catch(() => null)
        : Promise.resolve(n),
  );
  assertEquals(out, [1, null, 3]);
});

Deno.test("isHealthAbort: exit 75 stays pending; ran/timeout codes record", () => {
  assertEquals(isHealthAbort(75), true, "system_health abort — never ran");
  assertEquals(isHealthAbort(0), false, "success records");
  assertEquals(isHealthAbort(124), false, "timeout left a real partial diff");
  assertEquals(isHealthAbort(1), false);
});
