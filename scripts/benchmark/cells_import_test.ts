import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { importCampaign } from "./cells_import.ts";
import { readCell } from "./cells.ts";

/**
 * The completed codex campaigns predate the cell schema, so the importer reads
 * what the old layout DID capture (pins, patches, swebench verdicts) and leaves
 * the rest null. A gap must be visible as a gap: inventing a turn count or a
 * wall-clock for a run that never recorded one would make the cell lie about
 * its own provenance.
 */
Deno.test("importCampaign: old campaign in, honest cell out", async () => {
  const root = await Deno.makeTempDir({ prefix: "cells-import-" });
  try {
    const campaign = join(root, "pool2-codex-terra");
    const rep = join(campaign, "rep1");
    await ensureDir(rep);
    await Deno.writeTextFile(
      join(campaign, "campaign.json"),
      JSON.stringify({
        ide: "codex",
        model: "gpt-5.6-terra",
        effort: "medium",
      }),
    );
    await Deno.writeTextFile(
      join(rep, "run-meta.json"),
      JSON.stringify({
        rep: 1,
        ide: "codex",
        model: "gpt-5.6-terra",
        effort: "medium",
        split: "2026_03",
        stepTimeoutMs: 1200000,
        concurrency: 3,
      }),
    );
    await Deno.writeTextFile(
      join(rep, "baseline.jsonl"),
      [
        JSON.stringify({
          instance_id: "a__x-1",
          model_name_or_path: "baseline",
          model_patch: "diff --git a/f b/f\n+x\n",
        }),
        JSON.stringify({
          instance_id: "b__y-2",
          model_name_or_path: "baseline",
          model_patch: "",
        }),
      ].join("\n") + "\n",
    );
    await Deno.writeTextFile(
      join(rep, "solves.json"),
      JSON.stringify({ "a__x-1": true, "b__y-2": false, "c__z-3": false }),
    );

    // swebench's own verdict files, under the campaign-scoped run id.
    const evalRoot = join(root, "logs", "run_evaluation");
    const runId = "pool2-codex-gpt-5-6-terra-medium-rep1";
    for (
      const [id, resolved] of [["a__x-1", true], ["b__y-2", false]] as const
    ) {
      const d = join(evalRoot, runId, "baseline", id);
      await ensureDir(d);
      await Deno.writeTextFile(
        join(d, "report.json"),
        JSON.stringify({
          [id]: {
            resolved,
            tests_status: {
              FAIL_TO_PASS: {
                success: resolved ? ["t1", "t2"] : [],
                failure: resolved ? [] : ["t1", "t2"],
              },
              PASS_TO_PASS: { success: ["p1", "p2", "p3"], failure: [] },
            },
          },
        }),
      );
    }

    const cellDir = await importCampaign({
      campaignDir: campaign,
      cellsRoot: join(root, "cells"),
      evalRoot,
      harnessCommit: "e7aff6f",
      env: {
        hostname: "host",
        arch: "aarch64",
        cpuCount: 10,
        ramBytes: 17179869184,
        dockerVersion: "29.4.0",
        rosetta: true,
      },
      excluded: { "c__z-3": "dataset ref missing from the remote repo" },
    });

    assertEquals(
      cellDir,
      join(root, "cells", "codex-baseline-none-gpt-5-6-terra-medium"),
      "an imported bare campaign has no framework to fingerprint",
    );

    const cell = await readCell(cellDir);
    assertEquals(cell.header.key.arm, "baseline");
    assertEquals(cell.header.taskSet.split, "2026_03");
    assertEquals(cell.header.harness.stepTimeoutMs, 1200000);
    assertEquals(cell.header.harness.commit, "e7aff6f");
    assertEquals(cell.header.reps[0].concurrency, 3);
    assertEquals(
      cell.header.agent.modelSnapshot,
      null,
      "the old runs never recorded a snapshot — say so",
    );

    const byId = new Map(cell.tasks.map((t) => [t.instanceId, t]));
    const solved = byId.get("a__x-1")!;
    assertEquals(solved.status, "measured");
    assertEquals(solved.verdict?.resolved, true);
    assertEquals(solved.verdict?.klass, "clean");
    assert((solved.patchBytes ?? 0) > 0);
    assertEquals(solved.turns, undefined, "never captured back then");

    const missed = byId.get("b__y-2")!;
    assertEquals(missed.status, "measured");
    assertEquals(missed.verdict?.resolved, false);
    assertEquals(missed.patchBytes, 0);
    assertEquals(
      missed.emptyReason,
      "agent-gave-up",
      "an empty patch from a session that ran is the agent's own outcome",
    );

    const excluded = byId.get("c__z-3")!;
    assertEquals(excluded.status, "excluded");
    assert(excluded.excludedReason);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

/**
 * An instance in the task set with NO prediction row was never attempted (a
 * killed run, a guard storm). It must import as pending — the whole point of
 * the status trichotomy.
 */
Deno.test("importCampaign: an un-run instance imports as pending, not a miss", async () => {
  const root = await Deno.makeTempDir({ prefix: "cells-import-pending-" });
  try {
    const campaign = join(root, "camp");
    const rep = join(campaign, "rep2");
    await ensureDir(rep);
    await Deno.writeTextFile(
      join(rep, "run-meta.json"),
      JSON.stringify({
        rep: 2,
        ide: "codex",
        model: "gpt-5.6-sol",
        effort: "high",
        split: "2026_03",
        stepTimeoutMs: 1200000,
        concurrency: 1,
      }),
    );
    await Deno.writeTextFile(
      join(rep, "baseline.jsonl"),
      JSON.stringify({
        instance_id: "a__x-1",
        model_name_or_path: "baseline",
        model_patch: "diff\n",
      }) + "\n",
    );
    await Deno.writeTextFile(
      join(rep, "solves.json"),
      JSON.stringify({ "a__x-1": false, "b__y-2": false }),
    );

    const cellDir = await importCampaign({
      campaignDir: campaign,
      cellsRoot: join(root, "cells"),
      evalRoot: join(root, "nonexistent"),
      harnessCommit: "e7aff6f",
      env: {
        hostname: "h",
        arch: "aarch64",
        cpuCount: 10,
        ramBytes: 1,
        dockerVersion: null,
        rosetta: true,
      },
    });
    const cell = await readCell(cellDir);
    const byId = new Map(cell.tasks.map((t) => [t.instanceId, t]));
    assertEquals(byId.get("b__y-2")?.status, "pending");
    assert(byId.get("b__y-2")?.pendingReason);
    assertEquals(
      byId.get("a__x-1")?.status,
      "measured",
      "it ran; the missing report only means the verdict is unavailable",
    );
    assertEquals(byId.get("a__x-1")?.verdict, undefined);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
