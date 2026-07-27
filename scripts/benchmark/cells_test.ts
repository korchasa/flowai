import { assert, assertEquals, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  appendTask,
  cellId,
  type CellKey,
  currentCommit,
  frameworkFingerprint,
  passRate,
  readCell,
  type TaskRecord,
  taskRecordFromRun,
  taskSetChecksum,
  writeHeader,
} from "./cells.ts";

const KEY: CellKey = {
  ide: "codex",
  arm: "flowai",
  framework: "a1b2c3d",
  model: "gpt-5.6-terra",
  effort: "medium",
};

Deno.test("cellId is the (ide, arm+fw, model, effort) key", () => {
  assertEquals(cellId(KEY), "codex-flowai-a1b2c3d-gpt-5-6-terra-medium");

  // Every component moves the id — otherwise two campaigns share a record.
  const variants: CellKey[] = [
    { ...KEY, ide: "claude" },
    { ...KEY, arm: "baseline" },
    { ...KEY, framework: "9f8e7d6" },
    { ...KEY, model: "gpt-5.6-sol" },
    { ...KEY, effort: "high" },
  ];
  const ids = new Set([cellId(KEY), ...variants.map(cellId)]);
  assertEquals(ids.size, 6, "each key component must produce its own cell");
  for (const id of ids) assert(/^[a-z0-9-]+$/.test(id), `not a slug: ${id}`);

  // The bare arm has no framework to fingerprint — say so, don't fake a sha.
  assertEquals(
    cellId({ ...KEY, arm: "baseline", framework: null }),
    "codex-baseline-none-gpt-5-6-terra-medium",
  );
});

Deno.test("taskSetChecksum: order-independent, content-sensitive", async () => {
  const a = await taskSetChecksum(["b__x-2", "a__y-1"]);
  const b = await taskSetChecksum(["a__y-1", "b__x-2"]);
  assertEquals(a, b, "the set is the identity, not the listing order");
  const c = await taskSetChecksum(["a__y-1", "b__x-3"]);
  assert(a !== c, "a different task set is a different checksum");
});

/**
 * The rule the whole schema exists for. An instance the harness never ran must
 * not be counted as a miss: measured 2026-07-25, a health-abort storm left 45
 * instances un-run and they simply VANISHED from the predictions file, so any
 * pass rate over that file silently described a smaller, luckier set.
 */
Deno.test("pass rate refuses to count un-measured tasks", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cells-rate-" });
  try {
    await writeHeader(dir, KEY, {
      taskSet: {
        dataset: "nebius/SWE-rebench-leaderboard",
        split: "2026_03",
        forkCommit: "e4907b7",
        ids: ["a__x-1", "b__y-2", "c__z-3"],
        checksum: await taskSetChecksum(["a__x-1", "b__y-2", "c__z-3"]),
      },
      agent: {
        modelSnapshot: null,
        ideVersion: "0.144.6",
        bridgeVersion: null,
      },
      judge: { model: "sonnet", effort: "medium" },
      harness: {
        maxSteps: 3,
        stepTimeoutMs: 1200000,
        promptHash: "deadbeef",
        commit: "e7aff6f",
      },
      env: {
        hostname: "host",
        arch: "aarch64",
        cpuCount: 10,
        ramBytes: 17179869184,
        dockerVersion: "29.4.0",
        rosetta: true,
      },
      reps: [],
    });

    const rec = (
      id: string,
      status: TaskRecord["status"],
      resolved?: boolean,
    ) =>
      ({
        rep: 1,
        instanceId: id,
        status,
        ...(resolved === undefined ? {} : {
          verdict: {
            resolved,
            solved: resolved,
            noRegression: true,
            f2pPass: resolved ? 2 : 0,
            f2pFail: resolved ? 0 : 2,
            p2pPass: 10,
            p2pFail: 0,
            p2pFailedTests: [],
            klass: resolved ? "clean" : "unsolved",
          },
        }),
      }) as TaskRecord;

    await appendTask(dir, rec("a__x-1", "measured", true));
    await appendTask(dir, rec("b__y-2", "pending"));

    const cell = await readCell(dir);
    assertThrows(
      () => passRate(cell, 1),
      Error,
      "pending",
      "a rate over a partial set is exactly the 2026-07-25 mistake",
    );

    const partial = passRate(cell, 1, { allowPartial: true });
    assertEquals(partial.measured, 1);
    assertEquals(partial.resolved, 1);
    assertEquals(partial.pending, 1);

    // An excluded task is not pending and not a miss — it leaves the
    // denominator entirely (a dataset defect, not an agent failure).
    await appendTask(dir, rec("b__y-2", "measured", false));
    await appendTask(dir, {
      rep: 1,
      instanceId: "c__z-3",
      status: "excluded",
      excludedReason: "dataset ref missing from the remote repo",
    });
    const full = passRate(await readCell(dir), 1);
    assertEquals(full.measured, 2);
    assertEquals(full.resolved, 1);
    assertEquals(full.excluded, 1);
    assertEquals(full.pending, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

/**
 * The driver's own outcome → a task row. Every "never fairly attempted" class
 * must land as `pending`, and every empty patch from a session that DID run
 * must name its cause — those are the two ways a number went wrong this week.
 */
Deno.test("taskRecordFromRun: pending for un-run, named cause for an empty patch", () => {
  const base = { rep: 1, instanceId: "a__x-1", wallClockMs: 60_000, turns: 2 };

  const solved = taskRecordFromRun({
    ...base,
    code: 0,
    patch: "diff --git a/f b/f\n+x\n",
  });
  assertEquals(solved.status, "measured");
  assertEquals(solved.emptyReason, undefined);
  assertEquals(solved.turns, 2);
  assertEquals(solved.wallClockMs, 60_000);

  // Ran, produced nothing, exited cleanly — the agent's own outcome.
  assertEquals(
    taskRecordFromRun({ ...base, code: 0, patch: "" }).emptyReason,
    "agent-gave-up",
  );
  // Ran out of time; a partial diff may exist, but an empty one is the timeout.
  assertEquals(
    taskRecordFromRun({ ...base, code: 124, patch: "" }).emptyReason,
    "timeout",
  );

  // Never fairly attempted → pending, with the reason kept.
  for (
    const [outcome, reason] of [
      [{ code: 75 }, "health-abort"],
      [{ code: 1, authFailed: true }, "auth-fail"],
      [{ code: 1, setupFailed: true }, "setup-fail"],
    ] as const
  ) {
    const rec = taskRecordFromRun({ ...base, patch: "", ...outcome });
    assertEquals(rec.status, "pending", `${reason} must not count as a miss`);
    assert(rec.pendingReason?.includes(reason), rec.pendingReason);
    assertEquals(rec.verdict, undefined);
  }

  // An auth failure that still produced a patch DID engage the model — that is
  // a real measurement, not an infra artefact.
  assertEquals(
    taskRecordFromRun({ ...base, code: 1, authFailed: true, patch: "diff\n" })
      .status,
    "measured",
  );
});

Deno.test("a task record explains an empty patch", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cells-empty-" });
  try {
    await appendTask(dir, {
      rep: 2,
      instanceId: "a__x-1",
      status: "measured",
      exitCode: 124,
      turns: 3,
      wallClockMs: 1200000,
      patchBytes: 0,
      emptyReason: "timeout",
      patchPath: "rep2/a__x-1.patch",
    });
    const cell = await readCell(dir);
    const t = cell.tasks[0];
    assertEquals(t.emptyReason, "timeout");
    assertEquals(t.patchBytes, 0);
    assertEquals(t.exitCode, 124);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

/**
 * Resume appends; it never truncates. A second row for the same (rep, task) is
 * the later truth — same rule as the predictions file, whose append-only shape
 * is what makes a killed run resumable.
 */
Deno.test("appending the same task twice keeps the later row", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cells-resume-" });
  try {
    await appendTask(dir, { rep: 1, instanceId: "a__x-1", status: "pending" });
    await appendTask(dir, {
      rep: 1,
      instanceId: "a__x-1",
      status: "measured",
      exitCode: 0,
      patchBytes: 812,
    });
    const cell = await readCell(dir);
    assertEquals(cell.tasks.length, 1, "one row per (rep, instance)");
    assertEquals(cell.tasks[0].status, "measured");
    // The raw file still holds both rows — history is not rewritten.
    const raw = await Deno.readTextFile(join(dir, "tasks.jsonl"));
    assertEquals(raw.trim().split("\n").length, 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("cell header pins everything needed to re-interpret it", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cells-header-" });
  try {
    const ids = ["a__x-1", "b__y-2"];
    await writeHeader(dir, KEY, {
      taskSet: {
        dataset: "nebius/SWE-rebench-leaderboard",
        split: "2026_03",
        forkCommit: "e4907b7",
        ids,
        checksum: await taskSetChecksum(ids),
      },
      agent: {
        modelSnapshot: null,
        ideVersion: "0.144.6",
        bridgeVersion: "1.1.7",
      },
      judge: { model: "sonnet", effort: "medium" },
      harness: {
        maxSteps: 3,
        stepTimeoutMs: 1200000,
        promptHash: "deadbeef",
        commit: "e7aff6f",
      },
      env: {
        hostname: "host",
        arch: "aarch64",
        cpuCount: 10,
        ramBytes: 17179869184,
        dockerVersion: "29.4.0",
        rosetta: true,
      },
      reps: [{
        rep: 1,
        startedAt: "2026-07-26T00:00:00Z",
        finishedAt: "2026-07-26T02:00:00Z",
        concurrency: 1,
        healthAborts: 2,
        backoffWaits: 2,
      }],
    });
    const cell = await readCell(dir);
    assertEquals(cell.header.key.framework, "a1b2c3d");
    assertEquals(cell.header.harness.commit, "e7aff6f", "which code measured");
    assertEquals(cell.header.agent.bridgeVersion, "1.1.7");
    assertEquals(cell.header.reps[0].healthAborts, 2, "run conditions kept");
    assertEquals(
      cell.header.agent.modelSnapshot,
      null,
      "an unknown snapshot stays null — never invented",
    );
    assertEquals(cell.header.taskSet.checksum, await taskSetChecksum(ids));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

/**
 * The flowai arm's cell key carries WHICH flowai was installed. A commit sha
 * would not do: the framework is edited constantly and a run off an uncommitted
 * tree must not claim the sha of the last commit. The tree hash names the
 * content actually copied into the sandbox, and a dirty worktree says so.
 */
Deno.test("frameworkFingerprint names the framework tree, and admits when it is dirty", async () => {
  const fp = await frameworkFingerprint(Deno.cwd());
  assert(
    /^[0-9a-f]{12}(-dirty)?$/.test(fp),
    `not a fingerprint: ${fp}`,
  );
  assertEquals(
    fp,
    await frameworkFingerprint(Deno.cwd()),
    "same tree, same fingerprint — otherwise two identical runs split cells",
  );
  assert(
    fp !== await currentCommit(),
    "the framework tree is not the harness commit — they move independently",
  );
});
