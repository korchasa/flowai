import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  campaignKey,
  emptyProvenance,
  gateVerdict,
  loadProvenance,
  saveProvenance,
  stampCampaign,
  upsertGate,
} from "./pool2_gate.ts";
import { FORK_PINNED_COMMIT, REBENCH_DATASET } from "./rebench.ts";

Deno.test("gateVerdict: pass requires exactly k reps, all resolved", () => {
  assertEquals(gateVerdict([true, true, true], 3), true);
  assertEquals(gateVerdict([true, false, true], 3), false, "one flaky → out");
  assertEquals(gateVerdict([true, true], 3), false, "incomplete → not passed");
  assertEquals(gateVerdict([], 3), false);
});

/**
 * Several campaigns measure the SAME gate-passers: gate results are
 * model-independent (the gold gate validates the instance and its Docker image,
 * never the agent), so they are shared, while each campaign records its own
 * pins. A campaign is identified by the full triple (ide, model, effort) —
 * terra at medium and terra at high are different operating points and must not
 * share one record.
 *
 * NOTE: because effort is part of the identity, the provenance can no longer
 * detect "reps of one campaign blended two efforts" — a different effort is
 * simply a different campaign here. That protection lives at the campaign
 * DIRECTORY instead (`campaignMismatch` in pool2_measure.ts), which is the right
 * scope: one `--out` base holds rep1..rep3 of exactly one campaign.
 */
Deno.test("campaign pins: identity is the (ide, model, effort) triple", () => {
  const base = emptyProvenance(3);
  assertEquals(
    campaignKey("codex", "gpt-5.6-terra", "medium"),
    "codex/gpt-5.6-terra@medium",
  );

  const claude = stampCampaign(base, "claude", "sonnet", "high");
  const both = stampCampaign(claude, "codex", "gpt-5.6-terra", "medium");
  assertEquals(Object.keys(both.campaigns ?? {}).sort(), [
    "claude/sonnet@high",
    "codex/gpt-5.6-terra@medium",
  ]);
  assertEquals(both.campaigns?.["codex/gpt-5.6-terra@medium"], {
    ide: "codex",
    model: "gpt-5.6-terra",
    effort: "medium",
  });

  // Same model at another effort is its own campaign, not an overwrite.
  const three = stampCampaign(both, "codex", "gpt-5.6-terra", "high");
  assertEquals(Object.keys(three.campaigns ?? {}).length, 3);
  assertEquals(
    three.campaigns?.["codex/gpt-5.6-terra@medium"]?.effort,
    "medium",
  );

  // The ceiling probe is its own campaign too — sol-high alongside terra-medium.
  const withCeiling = stampCampaign(three, "codex", "gpt-5.6-sol", "high");
  assertEquals(
    withCeiling.campaigns?.["codex/gpt-5.6-sol@high"]?.model,
    "gpt-5.6-sol",
  );
});

Deno.test("campaign pins: stamping is idempotent and never rewrites gate results", () => {
  const withGate = upsertGate(emptyProvenance(3), {
    instanceId: "a__b-1",
    split: "2026_03",
    reps: [true, true, true],
    pass: true,
  }, "2026-07-22T00:00:00Z");
  const once = stampCampaign(withGate, "codex", "gpt-5.6-terra", "medium");
  const twice = stampCampaign(once, "codex", "gpt-5.6-terra", "medium");
  assertEquals(twice, once, "re-stamping the same pin changes nothing");
  assertEquals(twice.gates["a__b-1"].pass, true, "gate results survive intact");
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
