/**
 * Import a pre-cell campaign directory into a result cell (FR-BENCH-SWE.CELLS).
 *
 * The completed campaigns (claude/sonnet, codex/terra, the codex/sol ceiling)
 * predate the schema. Their data survives in four places — `campaign.json` /
 * `run-meta.json` (pins), `baseline.jsonl` (patches), `solves.json` (the task
 * set as run) and swebench's per-instance `report.json` (the verdict) — so the
 * import is a re-read, never a re-measurement.
 *
 * What those runs never captured (model snapshot, turns, wall-clock, judge
 * transcripts) stays null. A gap must look like a gap: inventing a number here
 * would make the cell lie about its own provenance.
 */

import { join } from "@std/path";
import { REBENCH_DATASET } from "./rebench.ts";
import { FORK_PINNED_COMMIT } from "./rebench.ts";
import { classifyReport } from "./retro.ts";
import { campaignRunId, type RepCampaign } from "./pool2_measure.ts";
import type { Prediction } from "./predictions.ts";
import {
  appendTask,
  type CellEnv,
  cellId,
  type CellKey,
  type CellRep,
  readCell,
  type TaskRecord,
  taskSetChecksum,
  writeHeader,
} from "./cells.ts";

export interface ImportOptions {
  /** Campaign base dir holding `rep<N>/` (and possibly `campaign.json`). */
  campaignDir: string;
  cellsRoot: string;
  /** Root of swebench's `logs/run_evaluation`. */
  evalRoot: string;
  /** Harness commit that produced the campaign. */
  harnessCommit: string;
  env: CellEnv;
  /** Instances that are dataset defects, with the reason. */
  excluded?: Record<string, string>;
}

interface RepMeta extends RepCampaign {
  rep: number;
  split: string;
  stepTimeoutMs: number;
  concurrency: number;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await Deno.readTextFile(path)) as T;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
}

async function readPredictions(
  path: string,
): Promise<Map<string, Prediction>> {
  const out = new Map<string, Prediction>();
  try {
    const text = await Deno.readTextFile(path);
    for (const line of text.split("\n")) {
      if (line.trim() === "") continue;
      const rec = JSON.parse(line) as Prediction;
      out.set(rec.instance_id, rec);
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  return out;
}

/** Rep dirs of a campaign, in rep order. */
async function repDirs(campaignDir: string): Promise<string[]> {
  const dirs: string[] = [];
  for await (const e of Deno.readDir(campaignDir)) {
    if (e.isDirectory && /^rep\d+$/.test(e.name)) dirs.push(e.name);
  }
  return dirs.sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
}

/**
 * Import every rep of one campaign into a single cell; returns the cell dir.
 * An imported campaign is always the BARE arm — the flowai arm postdates the
 * schema and writes cells directly.
 */
export async function importCampaign(opts: ImportOptions): Promise<string> {
  const reps = await repDirs(opts.campaignDir);
  if (reps.length === 0) {
    throw new Error(`no rep dirs under ${opts.campaignDir}`);
  }

  const metas: RepMeta[] = [];
  for (const r of reps) {
    const meta = await readJson<RepMeta>(
      join(opts.campaignDir, r, "run-meta.json"),
    );
    if (!meta) throw new Error(`${r}: run-meta.json missing — cannot pin it`);
    metas.push(meta);
  }
  const first = metas[0];
  for (const m of metas) {
    if (
      (m.ide ?? "claude") !== (first.ide ?? "claude") ||
      m.model !== first.model || m.effort !== first.effort
    ) {
      throw new Error(
        `${opts.campaignDir} blends campaigns: ` +
          `${m.ide}/${m.model}@${m.effort} vs ${first.ide}/${first.model}@${first.effort}`,
      );
    }
  }

  const key: CellKey = {
    ide: first.ide ?? "claude",
    arm: "baseline",
    framework: null,
    model: first.model,
    effort: first.effort,
  };
  const dir = join(opts.cellsRoot, cellId(key));

  // The task set is the union of every rep's solves.json — that is the list the
  // campaign was asked to run, including instances it never got to.
  const ids = new Set<string>();
  const solvesPerRep: Record<number, Record<string, boolean>> = {};
  for (const [i, r] of reps.entries()) {
    const solves = await readJson<Record<string, boolean>>(
      join(opts.campaignDir, r, "solves.json"),
    ) ?? {};
    solvesPerRep[metas[i].rep] = solves;
    for (const id of Object.keys(solves)) ids.add(id);
  }
  const idList = [...ids].sort();

  const cellReps: CellRep[] = metas.map((m) => ({
    rep: m.rep,
    // The old layout recorded no timestamps; the file mtime is the closest
    // honest stand-in and is filled by the caller when it matters.
    startedAt: "",
    finishedAt: null,
    concurrency: m.concurrency,
    healthAborts: 0,
    backoffWaits: 0,
  }));

  await writeHeader(dir, key, {
    taskSet: {
      dataset: REBENCH_DATASET,
      split: first.split,
      forkCommit: FORK_PINNED_COMMIT,
      ids: idList,
      checksum: await taskSetChecksum(idList),
    },
    agent: { modelSnapshot: null, ideVersion: null, bridgeVersion: null },
    judge: { model: "sonnet", effort: first.effort },
    harness: {
      maxSteps: 3,
      stepTimeoutMs: first.stepTimeoutMs,
      promptHash: "",
      commit: opts.harnessCommit,
    },
    env: opts.env,
    reps: cellReps,
  });

  for (const [i, r] of reps.entries()) {
    const meta = metas[i];
    const preds = await readPredictions(
      join(opts.campaignDir, r, "baseline.jsonl"),
    );
    const runId = campaignRunId(meta, meta.rep);
    for (const id of idList) {
      const excludedReason = opts.excluded?.[id];
      if (excludedReason) {
        await appendTask(dir, {
          rep: meta.rep,
          instanceId: id,
          status: "excluded",
          excludedReason,
        });
        continue;
      }
      const pred = preds.get(id);
      if (!pred) {
        await appendTask(dir, {
          rep: meta.rep,
          instanceId: id,
          status: "pending",
          pendingReason: "no prediction row — the instance was never attempted",
        });
        continue;
      }
      const patch = pred.model_patch ?? "";
      const rec: TaskRecord = {
        rep: meta.rep,
        instanceId: id,
        status: "measured",
        patchBytes: patch.length,
        patchPath: join(r, "baseline.jsonl"),
      };
      if (patch.trim() === "") {
        // The session ran and produced nothing. The pre-cell layout recorded no
        // abort marker in the data (only in the driver log), and a run that was
        // NOT fairly attempted never reached the predictions file at all — so an
        // empty patch here is the agent's own outcome.
        rec.emptyReason = "agent-gave-up";
      }
      const report = await readJson<unknown>(
        join(opts.evalRoot, runId, "baseline", id, "report.json"),
      );
      if (report !== null) {
        const g = classifyReport(runId, "baseline", id, report);
        rec.verdict = {
          resolved: g.resolved,
          solved: g.solved,
          noRegression: g.noRegression,
          f2pPass: g.f2pPass,
          f2pFail: g.f2pFail,
          p2pPass: g.p2pPass,
          p2pFail: g.p2pFail,
          p2pFailedTests: g.p2pFailedTests,
          klass: g.klass,
        };
      }
      await appendTask(dir, rec);
    }
  }
  return dir;
}

/** One-line summary per cell under `root` (for `cells-show`). */
export async function summariseCells(root: string): Promise<string[]> {
  const lines: string[] = [];
  for await (const e of Deno.readDir(root)) {
    if (!e.isDirectory) continue;
    const cell = await readCell(join(root, e.name));
    const reps = [...new Set(cell.tasks.map((t) => t.rep))].sort();
    const parts = reps.map((r) => {
      const rows = cell.tasks.filter((t) => t.rep === r);
      const measured = rows.filter((t) => t.status === "measured").length;
      const resolved = rows.filter((t) => t.verdict?.resolved).length;
      const pending = rows.filter((t) => t.status === "pending").length;
      return `rep${r} ${resolved}/${measured}` +
        (pending > 0 ? ` (+${pending} pending)` : "");
    });
    lines.push(`${e.name}: ${parts.join(", ")}`);
  }
  return lines.sort();
}
