/**
 * Baseline measurement tier for pool2 (FR-BENCH-SWE.POOL2).
 *
 * Drives the symmetric baseline arm (Claude Code + Sonnet, `BaselineJudgeOperator`
 * — FR-BENCH-SWE.SYMMETRY) over the gate-passing pool2 instances, then grades
 * the patches through the SWE-rebench fork (FR-BENCH-SWE.POOL2 grading path).
 * These baseline reps DOUBLE as the frozen baseline arm (honesty rule: selection
 * uses baseline behavior only), so the driver is:
 *   - RESUMABLE — a killed run (overnight sleep) keeps every completed instance
 *     in the rep's predictions file; a restart skips them (`pendingIds`);
 *   - CONCURRENT — a bounded pool (`mapPool`) runs several sessions at once, since
 *     the structural wall-clock ceiling is `session_timeout × ceil(N / concurrency)`.
 * One failed instance never sinks the batch — it lands as an empty prediction
 * (swebench scores it unresolved), matching `runBenchmark`'s contract.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type { InstanceData } from "./dataset.ts";
import type { AcpIde } from "@acceptance-tests/acp/registry.ts";
import { isTransientSetupFailure, runArm } from "./run.ts";
import {
  appendPrediction,
  type Prediction,
  toPrediction,
} from "./predictions.ts";
import { stripTestHunks } from "./patch.ts";
import { runRebenchEvaluation } from "./rebench.ts";

/** Ids from `all` not present in `done` (resume after an interrupted run). */
export function pendingIds(all: string[], done: Set<string>): string[] {
  return all.filter((id) => !done.has(id));
}

/**
 * Exit 75 = the `system_health` guard aborted the spawn before the agent ran
 * (machine overloaded — never measured). Such a session must NOT be recorded
 * as an empty prediction: an empty patch would be graded as a baseline failure
 * AND, being in the predictions file, skipped on the next resume — silently
 * miscounting an un-run instance as a genuine miss. Leave it pending instead.
 * A timeout (124) DID run and left a real partial diff, so it records normally.
 */
export function isHealthAbort(code: number): boolean {
  return code === 75;
}

/**
 * Order-preserving bounded-concurrency map: at most `n` of `fn` run at once,
 * results returned in input order. `fn` is responsible for its own error
 * handling (the batch runner wraps each instance so a failure yields a
 * sentinel, never a throw that aborts siblings).
 */
export async function mapPool<T, R>(
  items: readonly T[],
  n: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from(
    { length: Math.max(1, Math.min(n, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Instance ids already recorded in a rep's `baseline.jsonl` (for resume). */
async function donePredictionIds(predPath: string): Promise<Set<string>> {
  try {
    const text = await Deno.readTextFile(predPath);
    return new Set(
      text.split("\n").filter((l) => l.trim()).map(
        (l) => (JSON.parse(l) as Prediction).instance_id,
      ),
    );
  } catch {
    return new Set();
  }
}

/**
 * Campaign pins recorded next to a run — per rep (`<repDir>/run-meta.json`) and
 * per campaign base (`<baseOut>/campaign.json`, which owns rep1..rep3).
 */
export interface RepCampaign {
  /** Absent in reps written before FR-BENCH-SWE.IDE — those were all Claude. */
  ide?: string;
  model: string;
  effort: string;
}

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
 * Guard an output dir against a SECOND campaign writing into it.
 *
 * Two things go wrong without this. At the REP level `runBaselineBatch` resumes
 * from the ids already in `baseline.jsonl`, so aiming a codex campaign at the
 * Sonnet rep dir does not fail — it reports "0 pending" and silently adopts
 * Sonnet's predictions as codex's, measuring the wrong agent. At the CAMPAIGN
 * BASE level it catches reps that blend two efforts (rep 1 at medium, rep 2 at
 * high), which the provenance can no longer see now that effort is part of the
 * campaign key.
 *
 * Returns a human-readable reason, or null when the dir is fresh or the same
 * campaign is legitimately resuming.
 */
export function campaignMismatch(
  prior: RepCampaign | null,
  current: RepCampaign,
): string | null {
  if (!prior) return null;
  // Reps written before the ide field were all Claude runs — back-fill the
  // fact rather than letting a missing field match anything.
  const priorIde = prior.ide ?? "claude";
  const curIde = current.ide ?? "claude";
  if (
    priorIde === curIde && prior.model === current.model &&
    prior.effort === current.effort
  ) {
    return null;
  }
  return `belongs to campaign ${priorIde}/${prior.model}@${prior.effort}, ` +
    `but this run is ${curIde}/${current.model}@${current.effort}`;
}

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
 * swebench's grading run id, scoped to the campaign.
 *
 * swebench caches each verdict at `logs/run_evaluation/<runId>/<model>/
 * <instance>/report.json` and skips any instance already present. Since every
 * campaign grades under model name `baseline`, a rep-only id makes the SECOND
 * campaign inherit the FIRST one's verdicts wholesale — measured 2026-07-25,
 * where the codex terra run reported 31/67 of which 64 instances were never
 * graded, only replayed from the Sonnet campaign.
 *
 * The original claude/sonnet@high campaign keeps its historical id: its graded
 * logs (and the pool2 freeze derived from them) already live under that path,
 * and renaming would either orphan them or force a pointless regrade.
 */
export function campaignRunId(c: RepCampaign, rep: number): string {
  const ide = c.ide ?? "claude";
  if (ide === "claude" && c.model === "sonnet" && c.effort === "high") {
    return `pool2-baseline-rep${rep}`;
  }
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `pool2-${slug(ide)}-${slug(c.model)}-${slug(c.effort)}-rep${rep}`;
}

export interface BaselineBatchOptions {
  data: Map<string, InstanceData>;
  ids: string[];
  /** Rep-scoped output dir; predictions land at `<outDir>/baseline.jsonl`. */
  outDir: string;
  repoRoot: string;
  model: string;
  stepTimeoutMs: number;
  concurrency: number;
  /** Reasoning effort pinned for agent + judge (see run.ts effortEnv). */
  effort: string;
  /** IDE under test (FR-BENCH-SWE.IDE); defaults to `claude` in runArm. */
  ide?: AcpIde;
  /** Judge model — always Claude, independent of the IDE under test. */
  judgeModel?: string;
}

/**
 * Run the baseline arm over `ids` (skipping any already in the predictions
 * file), append one prediction per instance, and return the predictions path.
 * Never truncates — append-only is what makes a restart resumable.
 */
export async function runBaselineBatch(
  opts: BaselineBatchOptions,
): Promise<string> {
  await ensureDir(opts.outDir);
  const predPath = join(opts.outDir, "baseline.jsonl");
  const done = await donePredictionIds(predPath);
  const pending = pendingIds(opts.ids, done);
  console.log(
    `[pool2-measure] ${done.size} done, ${pending.length} pending` +
      ` (concurrency ${opts.concurrency})`,
  );

  await mapPool(pending, opts.concurrency, async (id) => {
    const data = opts.data.get(id);
    if (!data) throw new Error(`no metadata for ${id}`);
    let prediction: Prediction;
    try {
      const res = await runArm(data, {
        arm: "baseline",
        instanceIds: [],
        model: opts.model,
        outDir: opts.outDir,
        stepTimeoutMs: opts.stepTimeoutMs,
        repoRoot: opts.repoRoot,
        effort: opts.effort,
        ide: opts.ide,
        judgeModel: opts.judgeModel,
      });
      if (isHealthAbort(res.code)) {
        // Never ran (machine overloaded) — leave pending for a lower-concurrency
        // resume instead of recording a false baseline miss.
        console.error(
          `  [pool2-measure] HEALTH-ABORT ${id} (exit 75) — left pending`,
        );
        return null;
      }
      if (res.authFailed && !(res.prediction.model_patch ?? "").trim()) {
        // ACP token expired mid-batch — the model never engaged, so an empty
        // diff here is an infra artefact, not a genuine miss. Leave it pending
        // for a resume after re-login/refresh (distinct marker so the driver
        // can STOP on a sustained auth outage rather than spin like it does for
        // a transient load abort).
        console.error(
          `  [pool2-measure] AUTH-FAIL ${id} — left pending (re-login / token refresh)`,
        );
        return null;
      }
      prediction = res.prediction;
      console.log(`  [pool2-measure] ${id} exit=${res.code}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (isTransientSetupFailure(msg)) {
        // Network/DNS blip during the repo clone — the agent never ran. Leave
        // pending for a retry instead of banking a false miss (same rule as
        // AUTH-FAIL / HEALTH-ABORT). Distinct marker so the driver can tell a
        // transient setup blip from a genuine agent failure.
        console.error(
          `  [pool2-measure] SETUP-FAIL ${id} — left pending (transient clone/DNS)`,
        );
        return null;
      }
      console.error(`  [pool2-measure] FAILED ${id}: ${msg}`);
      prediction = toPrediction(id, "baseline", "");
    }
    await appendPrediction(opts.outDir, "baseline", prediction);
    return null;
  });
  return predPath;
}

/**
 * Grade a pool2 baseline predictions file through the fork and return the set
 * of resolved instance ids. Test hunks are stripped first (agent-authored
 * tests are never the oracle — same rule as the princeton path); the stripped
 * file is written alongside as `<path>.graded.jsonl`.
 */
export async function gradePool2Predictions(
  predPath: string,
  split: string,
  runId: string,
  cwd: string = Deno.cwd(),
): Promise<Set<string>> {
  const text = await Deno.readTextFile(predPath);
  const graded: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const rec = JSON.parse(line) as Prediction;
    const { patch } = stripTestHunks(rec.model_patch ?? "");
    graded.push(JSON.stringify({ ...rec, model_patch: patch }));
  }
  const gradedPath = `${predPath}.graded.jsonl`;
  await Deno.writeTextFile(gradedPath, graded.join("\n") + "\n");

  const report = await runRebenchEvaluation({
    predictionsPath: gradedPath,
    modelName: "baseline",
    runId,
    split,
    cwd,
  });
  return new Set(report.resolvedIds);
}
