import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  emptyProvenance,
  gateVerdict,
  loadProvenance,
  saveProvenance,
  upsertGate,
} from "./pool2_gate.ts";
import { FORK_PINNED_COMMIT, REBENCH_DATASET } from "./rebench.ts";

Deno.test("gateVerdict: pass requires exactly k reps, all resolved", () => {
  assertEquals(gateVerdict([true, true, true], 3), true);
  assertEquals(gateVerdict([true, false, true], 3), false, "one flaky → out");
  assertEquals(gateVerdict([true, true], 3), false, "incomplete → not passed");
  assertEquals(gateVerdict([], 3), false);
});

Deno.test("provenance: empty shape pins dataset + fork commit; upsert is idempotent by id", () => {
  const p = emptyProvenance(3);
  assertEquals(p.dataset, REBENCH_DATASET);
  assertEquals(p.forkCommit, FORK_PINNED_COMMIT);
  assertEquals(p.k, 3);
  assertEquals(p.modelSnapshot, null, "pinned later, at selection time");
  const r1 = upsertGate(p, {
    instanceId: "a__b-1",
    split: "2026_03",
    reps: [true, true, true],
    pass: true,
  }, "2026-07-22T00:00:00Z");
  const r2 = upsertGate(r1, {
    instanceId: "a__b-1",
    split: "2026_03",
    reps: [true, false, true],
    pass: false,
  }, "2026-07-23T00:00:00Z");
  assertEquals(Object.keys(r2.gates).length, 1, "same id overwrites");
  assertEquals(r2.gates["a__b-1"].pass, false, "latest result wins");
  assertEquals(r2.gates["a__b-1"].gatedAt, "2026-07-23T00:00:00Z");
});

Deno.test("provenance: load absent file yields empty store; save/load round-trips", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "pool2-gate-test-" });
  try {
    const path = join(tmp, "pool2_provenance.json");
    const fresh = await loadProvenance(path, 3);
    assertEquals(Object.keys(fresh.gates).length, 0);

    const withGate = upsertGate(fresh, {
      instanceId: "a__b-1",
      split: "2026_03",
      reps: [true, true, true],
      pass: true,
    }, "2026-07-22T00:00:00Z");
    await saveProvenance(path, withGate);
    const reloaded = await loadProvenance(path, 3);
    assertEquals(reloaded.gates["a__b-1"].pass, true);
    assert(reloaded.forkCommit === FORK_PINNED_COMMIT);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
