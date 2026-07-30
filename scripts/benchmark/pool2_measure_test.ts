import { assert, assertEquals } from "@std/assert";
import {
  campaignMismatch,
  campaignRunId,
  healthBackoffMs,
  isHealthAbort,
  mapPool,
  pendingIds,
  resolveRunAttempt,
  withHealthBackoff,
} from "./pool2_measure.ts";

Deno.test("healthBackoffMs: doubles from a minute, capped at 15", () => {
  assertEquals(healthBackoffMs(1), 60_000);
  assertEquals(healthBackoffMs(2), 120_000);
  assertEquals(healthBackoffMs(4), 480_000);
  assertEquals(healthBackoffMs(5), 900_000, "cap reached");
  assertEquals(healthBackoffMs(9), 900_000, "and stays there");
});

/**
 * A health abort means the machine had no room for this session — the next
 * instance would hit the same wall. Retrying it immediately turns the queue
 * into a hot loop that clones repo after repo and heats the machine further:
 * measured 2026-07-25, 45 of 51 instances aborted inside eight minutes while
 * load climbed to 52 on 10 CPU. So wait, retry the SAME instance, and only give
 * up after the attempt budget.
 */
Deno.test("withHealthBackoff: waits and retries the same instance until it runs", async () => {
  const waits: number[] = [];
  const sleep = (ms: number) => {
    waits.push(ms);
    return Promise.resolve();
  };

  let calls = 0;
  const ran = await withHealthBackoff(() => {
    calls++;
    return Promise.resolve({ code: calls < 3 ? 75 : 0 });
  }, { maxAttempts: 8, sleep });
  assertEquals(calls, 3, "retried until the guard let it through");
  assertEquals(waits, [60_000, 120_000], "waited between attempts, not after");
  assertEquals(ran.gaveUp, false);
  assertEquals(ran.result?.code, 0);

  // A run that never gets in gives up after the budget and stays pending.
  waits.length = 0;
  let tries = 0;
  const stuck = await withHealthBackoff(() => {
    tries++;
    return Promise.resolve({ code: 75 });
  }, { maxAttempts: 3, sleep });
  assertEquals(tries, 3);
  assertEquals(stuck.gaveUp, true);
  assertEquals(stuck.result, null, "no result to record — left pending");
  assertEquals(waits.length, 2, "no wait after the final attempt");

  // A healthy first run never sleeps.
  waits.length = 0;
  const clean = await withHealthBackoff(
    () => Promise.resolve({ code: 0, patch: "x" }),
    { maxAttempts: 8, sleep },
  );
  assertEquals(waits, []);
  assertEquals(
    clean.result?.patch,
    "x",
    "the caller's own fields pass through",
  );
});

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
 * The arm is the measured variable, so it must move the grading id too. Without
 * it a flowai rep over the same (ide, model, effort) would find the baseline's
 * cached reports and REPLAY them — the exact 2026-07-25 failure, one axis over.
 * Baseline ids stay byte-identical: their graded logs already exist on disk.
 */
Deno.test("campaignRunId: the arm moves the id, and baseline ids never move", () => {
  const terra = { ide: "codex", model: "gpt-5.6-terra", effort: "medium" };
  assertEquals(
    campaignRunId({ ...terra, arm: "baseline" }, 1),
    "pool2-codex-gpt-5-6-terra-medium-rep1",
    "an explicit baseline arm keeps the id the completed campaigns graded under",
  );
  assertEquals(
    campaignRunId({
      ide: "claude",
      model: "sonnet",
      effort: "high",
      arm: "baseline",
    }, 3),
    "pool2-baseline-rep3",
    "the historical claude/sonnet id survives an explicit arm",
  );

  const flowai = campaignRunId({ ...terra, arm: "flowai" }, 1);
  assert(
    flowai !== campaignRunId(terra, 1),
    "flowai must not grade under the baseline's id",
  );
  assertEquals(/^[a-z0-9-]+$/.test(flowai), true);
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

  // The arm owns the dir as much as the model does: a flowai rep aimed at the
  // baseline's dir would overwrite its run-meta and blend two arms' evidence.
  assert(
    campaignMismatch({ ...codex, arm: "baseline" }, {
      ...codex,
      arm: "flowai",
    }),
    "a flowai run must not write into a baseline rep dir",
  );
  assertEquals(
    campaignMismatch({ ...codex }, { ...codex, arm: "baseline" }),
    null,
    "dirs written before the arm field held the baseline arm",
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

/**
 * swebench caches each verdict under `logs/run_evaluation/<runId>/…` and SKIPS
 * any instance already there. So a rep that is discarded and re-measured under
 * the same id inherits the discarded run's verdicts: measured 2026-07-30, the
 * regrade printed "14 instances already run, skipping..." and stamped
 * `resolved: true` onto predictions whose patch was 0 bytes.
 *
 * A RESUME must keep its id (the cache is its own, and reusing it is the point);
 * a RE-MEASUREMENT must move to a fresh one.
 */
Deno.test("resolveRunAttempt: a resume keeps its id, a re-measurement moves off the stale cache", () => {
  const taken = (n: number) => n <= 2; // attempts 1 and 2 already graded

  // Recorded in run-meta by the first launch — every later resume must agree,
  // no matter what is on disk.
  assertEquals(
    resolveRunAttempt({ recorded: 2, hasPredictions: true, taken }),
    2,
  );
  assertEquals(
    resolveRunAttempt({ recorded: 1, hasPredictions: false, taken }),
    1,
  );

  // A rep dir that already holds predictions and predates the field: its logs
  // live under attempt 1, and moving it would orphan them.
  assertEquals(resolveRunAttempt({ hasPredictions: true, taken }), 1);

  // The re-measurement case: fresh rep dir, but the eval logs of the discarded
  // run are still on disk — take the first free attempt.
  assertEquals(resolveRunAttempt({ hasPredictions: false, taken }), 3);

  // Nothing graded yet — the historical id, byte-identical.
  assertEquals(
    resolveRunAttempt({ hasPredictions: false, taken: () => false }),
    1,
  );
});

Deno.test("campaignRunId: attempt 1 keeps the historical id, later attempts get their own", () => {
  const c = {
    ide: "codex",
    model: "gpt-5.6-terra",
    effort: "medium",
    arm: "flowai",
  };
  assertEquals(campaignRunId(c, 1), campaignRunId(c, 1, 1));
  assertEquals(campaignRunId(c, 1, 2), `${campaignRunId(c, 1)}-a2`);
  assert(campaignRunId(c, 1, 2) !== campaignRunId(c, 1));
  // Baseline ids must stay byte-identical on attempt 1 — their graded logs and
  // the pool2 freeze derived from them already live under that path.
  assertEquals(
    campaignRunId({ ide: "claude", model: "sonnet", effort: "high" }, 3, 1),
    "pool2-baseline-rep3",
  );
});
