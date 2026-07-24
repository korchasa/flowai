import { assertEquals } from "@std/assert";
import { assertThrows } from "@std/assert";
import {
  assembleSonnetReps,
  buildHeadroom,
  buildHeadroomRecord,
  classifyInstance,
  filterToWanted,
  type Pool2Headroom,
  selectPool2,
  verdictSummary,
  zeroRepIds,
  zeroRepsMissingOpus,
} from "./pool2_select.ts";
import type { Pool2Candidate } from "./pool2_fetch.ts";

Deno.test("assembleSonnetReps: counts resolved reps across the 3 solve maps", () => {
  const reps = [
    { a: true, b: false, c: true },
    { a: true, b: false, c: false },
    { a: false, b: false, c: true },
  ];
  assertEquals(assembleSonnetReps(reps), { a: 2, b: 0, c: 2 });
});

Deno.test("assembleSonnetReps: an id missing from a rep counts as unresolved there", () => {
  const reps: Array<Record<string, boolean>> = [
    { a: true },
    { a: true, b: true },
    { a: true },
  ];
  // b present-and-true in only one rep → 1; a true in all three → 3.
  assertEquals(assembleSonnetReps(reps), { a: 3, b: 1 });
});

Deno.test("zeroRepIds: sorted ids Sonnet never resolved (Opus-probe candidates)", () => {
  assertEquals(zeroRepIds({ a: 2, b: 0, c: 0, d: 1, e: 3 }), ["b", "c"]);
});

Deno.test("buildHeadroom: opus_resolved is null unless Sonnet went 0/3", () => {
  const hr = buildHeadroom({ a: 2, b: 0, c: 0 }, { b: true });
  assertEquals(hr.a, { sonnet_reps: 2, opus_resolved: null });
  assertEquals(hr.b, { sonnet_reps: 0, opus_resolved: true });
  // c is 0/3 but the probe has no verdict yet → null (flagged incomplete).
  assertEquals(hr.c, { sonnet_reps: 0, opus_resolved: null });
});

Deno.test("zeroRepsMissingOpus: 0/3 instances still awaiting an Opus verdict", () => {
  const hr = buildHeadroom({ a: 2, b: 0, c: 0 }, { b: true });
  assertEquals(zeroRepsMissingOpus(hr), ["c"]);
  // Once c has a verdict, nothing is missing.
  const done = buildHeadroom({ a: 2, b: 0, c: 0 }, { b: true, c: false });
  assertEquals(zeroRepsMissingOpus(done), []);
});

Deno.test("filterToWanted: no filter returns all; subset preserves passer order", () => {
  const passers = ["a", "b", "c", "d"];
  assertEquals(filterToWanted(passers, undefined), passers);
  assertEquals(filterToWanted(passers, []), passers);
  // Keeps passer order regardless of the order ids were requested in.
  assertEquals(filterToWanted(passers, ["d", "b"]), ["b", "d"]);
});

Deno.test("filterToWanted: an id that is not a gate-passer fails fast", () => {
  assertThrows(
    () => filterToWanted(["a", "b"], ["a", "zzz"]),
    Error,
    "zzz",
  );
});

Deno.test("classifyInstance: the four selection verdicts", () => {
  // excluded overrides everything (un-gradeable instance).
  assertEquals(
    classifyInstance({ sonnet_reps: 1, opus_resolved: null }, true),
    "excluded",
  );
  // 1/3 → keeper (headroom).
  assertEquals(
    classifyInstance({ sonnet_reps: 1, opus_resolved: null }, false),
    "keeper",
  );
  // 0/3 + Opus solved → keeper (ceiling).
  assertEquals(
    classifyInstance({ sonnet_reps: 0, opus_resolved: true }, false),
    "keeper",
  );
  // 2/3, 3/3 → reject, no headroom (Sonnet already reliable).
  assertEquals(
    classifyInstance({ sonnet_reps: 2, opus_resolved: null }, false),
    "reject_no_headroom",
  );
  assertEquals(
    classifyInstance({ sonnet_reps: 3, opus_resolved: null }, false),
    "reject_no_headroom",
  );
  // 0/3 + Opus also failed → reject, no ceiling (unsolvable on our scaffold).
  assertEquals(
    classifyInstance({ sonnet_reps: 0, opus_resolved: false }, false),
    "reject_no_ceiling",
  );
});

Deno.test("buildHeadroomRecord: full record keeps EVERY instance incl. failures", () => {
  const sonnetReps = { keep1: 1, easy: 3, hard: 0, ceil: 0, bad: 1 };
  const opus = { hard: false, ceil: true };
  const rec = buildHeadroomRecord(sonnetReps, opus, new Set(["bad"]));
  // Nothing dropped — rejects and excluded are recorded, not silently gone.
  assertEquals(Object.keys(rec).sort(), [
    "bad",
    "ceil",
    "easy",
    "hard",
    "keep1",
  ]);
  assertEquals(rec.keep1, {
    sonnet_reps: 1,
    opus_resolved: null,
    verdict: "keeper",
  });
  assertEquals(rec.easy.verdict, "reject_no_headroom");
  assertEquals(rec.hard, {
    sonnet_reps: 0,
    opus_resolved: false,
    verdict: "reject_no_ceiling",
  });
  assertEquals(rec.ceil.verdict, "keeper");
  assertEquals(rec.bad.verdict, "excluded");
});

Deno.test("verdictSummary: counts each verdict class", () => {
  const sonnetReps = { a: 1, b: 3, c: 0, d: 0, e: 2, f: 1 };
  const opus = { c: true, d: false };
  const rec = buildHeadroomRecord(sonnetReps, opus, new Set(["f"]));
  assertEquals(verdictSummary(rec), {
    keeper: 2, // a (1/3), c (0/3+opus)
    reject_no_headroom: 2, // b (3/3), e (2/3)
    reject_no_ceiling: 1, // d (0/3+opus fail)
    excluded: 1, // f
  });
});

function cand(id: string, patchBytes: number): Pool2Candidate {
  return {
    instanceId: id,
    repo: "r/" + id,
    createdAt: "2026-04-01 00:00:00",
    split: "2026_03",
    imageName: null,
    f2p: 1,
    p2p: 1,
    patchBytes,
  };
}

Deno.test("selectPool2: keeps headroom instances, cheapest-first, honoring exclude + n", () => {
  const hr: Record<string, Pool2Headroom> = {
    keepOne: { sonnet_reps: 1, opus_resolved: null }, // keeper (1/3)
    keepCeil: { sonnet_reps: 0, opus_resolved: true }, // keeper (0/3 + Opus)
    tooEasy: { sonnet_reps: 3, opus_resolved: null }, // reject (no headroom)
    noCeil: { sonnet_reps: 0, opus_resolved: false }, // reject (no ceiling)
    badData: { sonnet_reps: 1, opus_resolved: null }, // keeper but excluded
  };
  const candidates = [
    cand("keepOne", 900),
    cand("keepCeil", 300),
    cand("tooEasy", 100),
    cand("noCeil", 200),
    cand("badData", 50),
  ];
  const picked = selectPool2(hr, candidates, new Set(["badData"]), 20);
  // Only the two keepers survive; excluded badData dropped; cheapest-first.
  assertEquals(picked.map((c) => c.instanceId), ["keepCeil", "keepOne"]);
});

Deno.test("selectPool2: caps at n keepers when more qualify", () => {
  const hr: Record<string, Pool2Headroom> = {
    a: { sonnet_reps: 1, opus_resolved: null },
    b: { sonnet_reps: 1, opus_resolved: null },
    c: { sonnet_reps: 1, opus_resolved: null },
  };
  const candidates = [cand("a", 30), cand("b", 20), cand("c", 10)];
  const picked = selectPool2(hr, candidates, new Set(), 2);
  assertEquals(picked.map((c) => c.instanceId), ["c", "b"]);
});
