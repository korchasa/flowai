/**
 * Integrity guard for the pool2 headroom data-of-record
 * (`pool2_headroom.json`, produced by `benchmark pool2-select`). These tests
 * read the committed file and re-derive every verdict from first principles, so
 * a hand-edit or a regeneration bug that desyncs the funnel counts, mislabels a
 * keeper, or leaves the Opus probe incomplete fails `deno task check` loudly.
 */

import { assert, assertEquals } from "@std/assert";
import {
  classifyInstance,
  isHeadroomKeeper,
  type Pool2HeadroomEntry,
  type Pool2Verdict,
  verdictSummary,
} from "./pool2_select.ts";
import headroomData from "./pool2_headroom.json" with { type: "json" };
import poolData from "./pool2.json" with { type: "json" };
import type { Pool2Candidate } from "./pool2_fetch.ts";

const HEADROOM = headroomData as {
  provenance: {
    summary: Record<Pool2Verdict, number>;
    excluded: string[];
    eligible: number;
    opusProbe: { queueSize: number; resolved: number };
  };
  instances: Record<string, Pool2HeadroomEntry>;
};

const POOL2 = poolData as Pool2Candidate[];

Deno.test("headroom: every keeper actually satisfies the shared keep-rule", () => {
  for (const [id, e] of Object.entries(HEADROOM.instances)) {
    if (e.verdict === "keeper") {
      assert(
        isHeadroomKeeper(e),
        `${id} is labelled keeper but fails isHeadroomKeeper (${
          JSON.stringify(e)
        })`,
      );
    }
  }
});

Deno.test("headroom: every reject genuinely lacks headroom or ceiling", () => {
  for (const [id, e] of Object.entries(HEADROOM.instances)) {
    if (e.verdict === "reject_no_headroom") {
      assert(e.sonnet_reps >= 2, `${id}: reject_no_headroom but reps<2`);
    }
    if (e.verdict === "reject_no_ceiling") {
      assertEquals(e.sonnet_reps, 0, `${id}: reject_no_ceiling but reps≠0`);
      assertEquals(
        e.opus_resolved,
        false,
        `${id}: reject_no_ceiling but Opus did not fail it`,
      );
    }
    // No reject is secretly a keeper.
    if (e.verdict.startsWith("reject")) {
      assert(!isHeadroomKeeper(e), `${id}: reject label but IS a keeper`);
    }
  }
});

Deno.test("headroom: each verdict re-derives from (headroom, excluded)", () => {
  const excluded = new Set(HEADROOM.provenance.excluded);
  for (const [id, e] of Object.entries(HEADROOM.instances)) {
    assertEquals(
      classifyInstance(e, excluded.has(id)),
      e.verdict,
      `${id}: stored verdict ${e.verdict} disagrees with re-derivation`,
    );
  }
});

Deno.test("headroom: provenance summary matches the actual verdict counts", () => {
  assertEquals(verdictSummary(HEADROOM.instances), HEADROOM.provenance.summary);
});

Deno.test("headroom: eligible = total instances − excluded", () => {
  const total = Object.keys(HEADROOM.instances).length;
  assertEquals(
    HEADROOM.provenance.eligible,
    total - HEADROOM.provenance.excluded.length,
  );
});

Deno.test("headroom: the Opus probe is COMPLETE for every non-excluded 0/3", () => {
  const excluded = new Set(HEADROOM.provenance.excluded);
  for (const [id, e] of Object.entries(HEADROOM.instances)) {
    if (e.sonnet_reps === 0 && !excluded.has(id)) {
      assert(
        typeof e.opus_resolved === "boolean",
        `${id}: 0/3 with no Opus verdict — probe incomplete, reject/keep is an artefact`,
      );
    }
  }
});

Deno.test("headroom: excluded instances carry the 'excluded' verdict", () => {
  for (const id of HEADROOM.provenance.excluded) {
    assertEquals(
      HEADROOM.instances[id]?.verdict,
      "excluded",
      `${id} is in provenance.excluded but not verdict-excluded`,
    );
  }
});

Deno.test("pool2: every frozen instance is a keeper in the data-of-record", () => {
  const excluded = new Set(HEADROOM.provenance.excluded);
  for (const c of POOL2) {
    const e = HEADROOM.instances[c.instanceId];
    assert(
      e !== undefined,
      `${c.instanceId} in pool but not in headroom record`,
    );
    assertEquals(
      e.verdict,
      "keeper",
      `${c.instanceId} is frozen into the pool but its verdict is ${e.verdict}`,
    );
    assert(
      !excluded.has(c.instanceId),
      `${c.instanceId} is both pooled and excluded`,
    );
  }
});

Deno.test("pool2: size equals the keeper count (all keepers fit under the cap)", () => {
  // 8 keepers < 20 cap, so the frozen pool holds every keeper. If a future
  // regeneration produced >cap keepers this would flag the truncation.
  assertEquals(POOL2.length, HEADROOM.provenance.summary.keeper);
});

Deno.test("pool2: ordered cheapest-first (patch bytes then id)", () => {
  for (let i = 1; i < POOL2.length; i++) {
    const prev = POOL2[i - 1];
    const cur = POOL2[i];
    const ok = prev.patchBytes < cur.patchBytes ||
      (prev.patchBytes === cur.patchBytes &&
        prev.instanceId.localeCompare(cur.instanceId) <= 0);
    assert(
      ok,
      `pool not cheapest-first at ${i}: ${prev.instanceId} (${prev.patchBytes}B) ` +
        `before ${cur.instanceId} (${cur.patchBytes}B)`,
    );
  }
});
