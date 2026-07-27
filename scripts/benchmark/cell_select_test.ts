import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { Cell, TaskRecord } from "./cells.ts";
import {
  buildSelection,
  classifyFromCells,
  loadFrozenPool,
  subjectTally,
} from "./cell_select.ts";

/** Minimal cell holding just the rows a selection reads. */
function cellOf(tasks: TaskRecord[]): Cell {
  return { header: null as unknown as Cell["header"], tasks };
}

const solved = (rep: number, id: string, resolved: boolean): TaskRecord => ({
  rep,
  instanceId: id,
  status: "measured",
  verdict: {
    resolved,
    solved: resolved,
    noRegression: true,
    f2pPass: resolved ? 1 : 0,
    f2pFail: resolved ? 0 : 1,
    p2pPass: 5,
    p2pFail: 0,
    p2pFailedTests: [],
    klass: resolved ? "clean" : "unsolved",
  },
});

Deno.test("subjectTally: counts solves and measured reps per instance", () => {
  const cell = cellOf([
    solved(1, "a__x-1", true),
    solved(2, "a__x-1", false),
    solved(3, "a__x-1", true),
    solved(1, "b__y-2", false),
    { rep: 2, instanceId: "b__y-2", status: "pending" },
    solved(3, "b__y-2", false),
  ]);
  const t = subjectTally(cell, [1, 2, 3]);
  assertEquals(t.get("a__x-1"), { solves: 2, measured: 3 });
  assertEquals(
    t.get("b__y-2"),
    { solves: 0, measured: 2 },
    "a pending rep is not a miss — it is simply not measured",
  );
});

/**
 * The keep-rule, confirmed by the user 2026-07-26: an instance enters the pool
 * only where the subject is UNSTABLE (exactly one solve in three) or helpless
 * but not hopeless (never solves, yet the ceiling model does). Everything the
 * subject solves twice or more has no headroom to show; what nobody solves has
 * no ceiling to reach.
 */
Deno.test("classifyFromCells: the keep-rule and its two rejections", () => {
  const r = (solves: number, measured: number, ceiling: boolean | null) =>
    classifyFromCells({ solves, measured }, ceiling, 3);

  assertEquals(r(1, 3, null), "keeper_unstable");
  assertEquals(r(0, 3, true), "keeper_ceiling");
  assertEquals(r(0, 3, false), "reject_no_ceiling");
  assertEquals(r(2, 3, null), "reject_no_headroom");
  assertEquals(r(3, 3, null), "reject_no_headroom");

  // 0/3 with the ceiling never run is undecided, NOT a rejection — the ceiling
  // probe is what settles it, and pretending otherwise silently drops tasks.
  assertEquals(r(0, 3, null), "undecided_no_ceiling_run");

  // An incomplete subject cannot be classified at all: one more rep could move
  // it from 1/3 (keeper) to 2/3 (reject).
  assertEquals(r(1, 2, null), "incomplete");
  assertEquals(r(0, 0, true), "incomplete");
});

Deno.test("buildSelection: pool, verdicts and counts from two cells", () => {
  const subject = cellOf([
    // 1/3 → keeper
    solved(1, "unstable", true),
    solved(2, "unstable", false),
    solved(3, "unstable", false),
    // 0/3, ceiling solves → keeper
    solved(1, "hard", false),
    solved(2, "hard", false),
    solved(3, "hard", false),
    // 0/3, ceiling fails → rejected
    solved(1, "dead", false),
    solved(2, "dead", false),
    solved(3, "dead", false),
    // 3/3 → rejected
    solved(1, "easy", true),
    solved(2, "easy", true),
    solved(3, "easy", true),
    // never fairly attempted in one rep → incomplete
    solved(1, "partial", true),
    { rep: 2, instanceId: "partial", status: "pending" },
    solved(3, "partial", false),
    // dataset defect
    {
      rep: 1,
      instanceId: "broken",
      status: "excluded",
      excludedReason: "bad ref",
    },
  ]);
  const ceiling = cellOf([
    solved(1, "hard", false),
    solved(2, "hard", true), // the second ceiling pass got it
    solved(1, "dead", false),
    solved(2, "dead", false),
  ]);

  const sel = buildSelection({
    subject,
    ceiling,
    subjectReps: [1, 2, 3],
    ceilingReps: [1, 2],
    subjectCellId: "codex-baseline-none-gpt-5-6-terra-medium",
    ceilingCellId: "codex-baseline-none-gpt-5-6-sol-high",
  });

  assertEquals(
    sel.pool,
    ["hard", "unstable"],
    "pool is sorted and keepers only",
  );
  assertEquals(sel.counts.keeper_unstable, 1);
  assertEquals(sel.counts.keeper_ceiling, 1);
  assertEquals(sel.counts.reject_no_ceiling, 1);
  assertEquals(sel.counts.reject_no_headroom, 1);
  assertEquals(sel.counts.incomplete, 1);
  assertEquals(sel.counts.excluded, 1);

  const byId = new Map(sel.instances.map((i) => [i.instanceId, i]));
  assertEquals(byId.get("hard")?.ceilingSolved, true);
  assertEquals(byId.get("unstable")?.subjectSolves, 1);
  assertEquals(byId.get("broken")?.verdict, "excluded");
  assertEquals(
    byId.get("partial")?.verdict,
    "incomplete",
    "an unfinished subject must not be frozen into a pool",
  );
});

Deno.test("buildSelection: refuses a subject cell with no completed reps", () => {
  assertThrows(
    () =>
      buildSelection({
        subject: cellOf([{ rep: 1, instanceId: "a", status: "pending" }]),
        ceiling: cellOf([]),
        subjectReps: [1, 2, 3],
        ceilingReps: [1],
        subjectCellId: "s",
        ceilingCellId: "c",
      }),
    Error,
    "no instance",
  );
});

/**
 * A frozen pool file is the contract a flowai campaign runs against, so reading
 * it is a gate, not a convenience: an empty or malformed pool must stop the run
 * before any paid session, never degrade into "measured zero instances".
 */
Deno.test("loadFrozenPool: returns the frozen ids, and refuses an empty pool", async () => {
  const dir = await Deno.makeTempDir({ prefix: "frozen-pool-" });
  try {
    const good = `${dir}/pool.json`;
    await Deno.writeTextFile(
      good,
      JSON.stringify({
        subjectCellId: "codex-baseline-none-gpt-5-6-terra-medium",
        pool: ["b__b-2", "a__a-1"],
      }),
    );
    const loaded = await loadFrozenPool(good);
    assertEquals(
      loaded.pool,
      ["a__a-1", "b__b-2"],
      "sorted, order-independent",
    );
    assertEquals(
      loaded.subjectCellId,
      "codex-baseline-none-gpt-5-6-terra-medium",
      "the baseline cell this pool was frozen against travels with it",
    );

    const empty = `${dir}/empty.json`;
    await Deno.writeTextFile(empty, JSON.stringify({ pool: [] }));
    await assertRejects(() => loadFrozenPool(empty), Error, "empty");
    await assertRejects(
      () => loadFrozenPool(`${dir}/absent.json`),
      Error,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
