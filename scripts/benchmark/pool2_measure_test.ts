import { assert, assertEquals } from "@std/assert";
import {
  campaignMismatch,
  isHealthAbort,
  mapPool,
  pendingIds,
} from "./pool2_measure.ts";

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
