import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  fetchAllCandidates,
  fetchSplit,
  type RowsFetcher,
  toCandidate,
} from "./pool2_fetch.ts";

const ROW = {
  instance_id: "tox-dev__tox-3904",
  repo: "tox-dev/tox",
  created_at: "2026-03-26 04:52:51",
  patch: "diff --git a/x b/x\n+fix\n",
  FAIL_TO_PASS: ["tests/a.py::t1", "tests/b.py::t2"],
  PASS_TO_PASS: ["tests/a.py::t3"],
  image_name: "swerebench/sweb.eval.x86_64.tox-dev_1776_tox-3904:latest",
};

Deno.test("toCandidate: maps a leaderboard row, counts F2P/P2P, measures patch", () => {
  const c = toCandidate(ROW, "2026_03");
  assertEquals(c.instanceId, "tox-dev__tox-3904");
  assertEquals(c.repo, "tox-dev/tox");
  assertEquals(c.createdAt, "2026-03-26 04:52:51");
  assertEquals(c.split, "2026_03");
  assertEquals(c.f2p, 2);
  assertEquals(c.p2p, 1);
  assertEquals(c.patchBytes, ROW.patch.length);
  assert(c.imageName!.startsWith("swerebench/"));
});

Deno.test("toCandidate: missing instance_id fails fast", () => {
  assertThrows(
    () => toCandidate({ repo: "a/b" }, "2026_03"),
    Error,
    "instance_id",
  );
});

function fakeFetcher(total: number): { calls: string[]; fetcher: RowsFetcher } {
  const calls: string[] = [];
  const fetcher: RowsFetcher = (url) => {
    calls.push(url);
    const offset = Number(new URL(url).searchParams.get("offset"));
    const length = Number(new URL(url).searchParams.get("length"));
    const n = Math.max(0, Math.min(length, total - offset));
    return Promise.resolve({
      num_rows_total: total,
      rows: Array.from({ length: n }, (_, i) => ({
        row: {
          ...ROW,
          instance_id: `inst__${offset + i}`,
          created_at: `2026-03-${
            String((offset + i) % 28 + 1).padStart(2, "0")
          } 00:00:00`,
        },
      })),
    });
  };
  return { calls, fetcher };
}

Deno.test("fetchSplit: paginates the datasets-server rows API at 100/page", async () => {
  const { calls, fetcher } = fakeFetcher(150);
  const cands = await fetchSplit("2026_03", fetcher);
  assertEquals(cands.length, 150);
  assertEquals(calls.length, 2, "150 rows → offsets 0 and 100");
  assert(calls[0].includes("offset=0"));
  assert(calls[1].includes("offset=100"));
  assert(calls[0].includes("split=2026_03"));
});

Deno.test("fetchAllCandidates: merges splits and sorts fresh-first", async () => {
  const fetcher: RowsFetcher = (url) => {
    const split = new URL(url).searchParams.get("split")!;
    const created = split === "2026_03"
      ? "2026-03-10 00:00:00"
      : "2026-02-10 00:00:00";
    return Promise.resolve({
      num_rows_total: 1,
      rows: [{
        row: { ...ROW, instance_id: `i__${split}`, created_at: created },
      }],
    });
  };
  const cands = await fetchAllCandidates(["2026_02", "2026_03"], fetcher);
  assertEquals(cands.length, 2);
  assertEquals(
    cands[0].instanceId,
    "i__2026_03",
    "freshest candidate comes first",
  );
});
