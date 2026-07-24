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
