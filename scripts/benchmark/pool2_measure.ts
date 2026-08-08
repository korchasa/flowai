/**
 * Measurement tier for pool2 (FR-BENCH-SWE.POOL2).
 *
 * Drives ONE arm over pool2 instances under the symmetric harness
 * (FR-BENCH-SWE.SYMMETRY — one human emulator serves both arms), then grades the patches
 * through the SWE-rebench fork (FR-BENCH-SWE.POOL2 grading path). The baseline
 * arm's reps DOUBLE as the frozen baseline (honesty rule: selection uses
 * baseline behavior only); the flowai arm then runs over the frozen pool those
 * reps selected. Either way the driver is:
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
import { type Arm, isTransientSetupFailure, runArm } from "./run.ts";
import {
  appendPrediction,
  type Prediction,
  toPrediction,
} from "./predictions.ts";
import { appendTask, type TaskRecord, taskRecordFromRun } from "./cells.ts";
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
 * Wait before retrying a health-aborted spawn: one minute, doubling, capped at
 * fifteen. The cap keeps a long overload (someone else using the machine) from
 * turning into an hours-long single sleep, while the growth stops a busy host
 * from being polled every minute all night.
 */
export function healthBackoffMs(attempt: number): number {
  return Math.min(60_000 * 2 ** (attempt - 1), 900_000);
}

export interface HealthBackoffOptions {
  /** Spawn attempts for ONE instance before it is left pending. */
  maxAttempts: number;
  sleep: (ms: number) => Promise<void>;
  /** Called before each wait — the driver logs it so an operator sees why. */
  onWait?: (attempt: number, ms: number) => void;
}

/**
 * implements [FR-BENCH-SWE.POOL2](../../documents/requirements.md#fr-bench-swe-pool2-second-task-pool-swe-rebench-with-measured-headroom-ancfrbench-swe-pool2):
 * Run one instance, waiting out `system_health` aborts instead of racing past
 * them.
 *
 * An abort means the host had no room for this session, so the NEXT instance
 * would hit the same wall — retrying immediately turns the queue into a hot
 * loop that clones repo after repo and heats the machine further (measured
 * 2026-07-25: 45 of 51 instances aborted within eight minutes while load
 * climbed to 52 on 10 CPU). Waiting and retrying the SAME instance keeps the
 * queue intact; only after the attempt budget is it left pending.
 *
 * The guard itself is never bypassed — this only changes how the driver reacts
 * to it.
 */
export async function withHealthBackoff<T extends { code: number }>(
  run: () => Promise<T>,
  opts: HealthBackoffOptions,
): Promise<{ result: T | null; attempts: number; gaveUp: boolean }> {
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const result = await run();
    if (!isHealthAbort(result.code)) {
      return { result, attempts: attempt, gaveUp: false };
    }
    if (attempt === opts.maxAttempts) break;
    const ms = healthBackoffMs(attempt);
    opts.onWait?.(attempt, ms);
    await opts.sleep(ms);
  }
  return { result: null, attempts: opts.maxAttempts, gaveUp: true };
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
  /** Absent in reps written before the flowai arm — those were all baseline. */
  arm?: string;
  /** Framework tree fingerprint; set only for the flowai arm. */
  framework?: string | null;
}

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-codex-is-the-ide-under-test-ancfrbench-swe-ide):
 * Guard an output dir against a SECOND campaign writing into it.
 *
 * Two things go wrong without this. At the REP level `runArmBatch` resumes
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
  // Dirs written before the flowai arm existed held the baseline arm — back-fill
  // the fact rather than letting a missing field match anything.
  const priorArm = prior.arm ?? "baseline";
  const curArm = current.arm ?? "baseline";
  if (
    priorIde === curIde && prior.model === current.model &&
    prior.effort === current.effort && priorArm === curArm
  ) {
    return null;
  }
  return `belongs to campaign ${priorArm}/${priorIde}/${prior.model}@${prior.effort}, ` +
    `but this run is ${curArm}/${curIde}/${current.model}@${current.effort}`;
}

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-codex-is-the-ide-under-test-ancfrbench-swe-ide):
 * swebench's grading run id, scoped to the campaign.
 *
 * swebench caches each verdict at `logs/run_evaluation/<runId>/<model>/
 * <instance>/report.json` and skips any instance already present. Since every
 * campaign grades under model name `baseline`, a rep-only id makes the SECOND
 * campaign inherit the FIRST one's verdicts wholesale — measured 2026-07-25,
 * where the codex terra run reported 31/67 of which 64 instances were never
 * graded, only replayed from the Sonnet campaign.
 *
 * The ARM is part of the campaign for the same reason: a flowai rep over the
 * same (ide, model, effort) would otherwise find the baseline's cached reports
 * and replay them. Baseline ids are left byte-identical — their graded logs
 * already exist on disk — so only a non-baseline arm adds a segment.
 *
 * The original claude/sonnet@high campaign keeps its historical id: its graded
 * logs (and the pool2 freeze derived from them) already live under that path,
 * and renaming would either orphan them or force a pointless regrade.
 */
export function campaignRunId(
  c: RepCampaign,
  rep: number,
  attempt = 1,
): string {
  const ide = c.ide ?? "claude";
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const arm = c.arm ?? "baseline";
  const armSeg = arm === "baseline" ? "" : `${slug(arm)}-`;
  // Attempt 1 keeps the historical id byte-identical, so every graded log on
  // disk (and the pool2 freeze derived from it) stays where it is.
  const attemptSeg = attempt > 1 ? `-a${attempt}` : "";
  if (
    arm === "baseline" && ide === "claude" && c.model === "sonnet" &&
    c.effort === "high"
  ) {
    return `pool2-baseline-rep${rep}${attemptSeg}`;
  }
  return `pool2-${armSeg}${slug(ide)}-${slug(c.model)}-${
    slug(c.effort)
  }-rep${rep}${attemptSeg}`;
}

/**
 * Pick the grading attempt for a rep: which `logs/run_evaluation/<runId>` this
 * measurement owns.
 *
 * swebench caches every verdict under that path and SKIPS any instance already
 * present. Reusing the cache is exactly right for a RESUME — the rows belong to
 * this same measurement. It is exactly wrong for a RE-MEASUREMENT: measured
 * 2026-07-30, a discarded rep-1 was re-run under the same id, the regrade
 * printed "14 instances already run, skipping..." and stamped `resolved: true`
 * onto predictions whose patch was 0 bytes.
 *
 * The two cases are told apart by state, not by a flag the operator must
 * remember to pass:
 * - `recorded` (from `run-meta.json`) wins outright — a measurement never moves
 *   its id once it has one, whatever else is on disk.
 * - a rep dir that already holds predictions but no recorded attempt predates
 *   this field; its logs live under attempt 1 and moving it would orphan them.
 * - otherwise the rep dir is fresh, so any graded log under this id belongs to
 *   a run that is no longer here: take the first free attempt.
 */
export function resolveRunAttempt(
  opts: {
    /** Attempt pinned in `run-meta.json`, if the rep was launched before. */
    recorded?: number;
    /** Does the rep dir already hold prediction rows? */
    hasPredictions: boolean;
    /** Is `logs/run_evaluation/<runId of attempt N>` already on disk? */
    taken: (attempt: number) => boolean;
  },
): number {
  if (opts.recorded !== undefined) return opts.recorded;
  if (opts.hasPredictions) return 1;
  let attempt = 1;
  while (opts.taken(attempt)) attempt++;
  return attempt;
}

export interface ArmBatchOptions {
  data: Map<string, InstanceData>;
  ids: string[];
  /**
   * Arm under measurement. `baseline` is the bare IDE; `flowai` installs the
   * core pack and is operator-driven (runArm owns both shapes). Defaults to
   * baseline so pre-flowai callers keep their behaviour.
   */
  arm?: Arm;
  /** Rep-scoped output dir; predictions land at `<outDir>/<arm>.jsonl`. */
  outDir: string;
  repoRoot: string;
  model: string;
  stepTimeoutMs: number;
  concurrency: number;
  /** Reasoning effort pinned for agent + human emulator (see run.ts effortEnv). */
  effort: string;
  /** IDE under test (FR-BENCH-SWE.IDE); defaults to `claude` in runArm. */
  ide?: AcpIde;
  /** Human-emulator model — always Claude, independent of the IDE under test. */
  humanEmulatorModel?: string;
  /** Spawn attempts per instance while the health guard keeps aborting. */
  healthAttempts?: number;
  /** Injected for tests; production waits with setTimeout. */
  sleep?: (ms: number) => Promise<void>;
  /** Rep number — stamped on every cell row. */
  rep: number;
  /** Cell dir to append task rows to (FR-BENCH-SWE.CELLS). Omit to skip. */
  cellDir?: string;
}

/** What a batch did, beyond the predictions it wrote. */
export interface BatchOutcome {
  predPath: string;
  /** Health-guard aborts seen, incl. the waits the backoff sat through. */
  healthAborts: number;
  backoffWaits: number;
}

/**
 * Attempts per instance under a tripping health guard. Eight covers roughly an
 * hour of waiting (1+2+4+8+15+15+15 min) — long enough to sit out a build or a
 * heavy app, short enough that a permanently busy host is reported, not hidden.
 */
export const DEFAULT_HEALTH_ATTEMPTS = 8;

/**
 * Run ONE arm over `ids` (skipping any already in the predictions file), append
 * one prediction per instance, and return the predictions path. Never truncates
 * — append-only is what makes a restart resumable.
 */
export async function runArmBatch(
  opts: ArmBatchOptions,
): Promise<BatchOutcome> {
  const arm: Arm = opts.arm ?? "baseline";
  await ensureDir(opts.outDir);
  const predPath = join(opts.outDir, `${arm}.jsonl`);
  const done = await donePredictionIds(predPath);
  const pending = pendingIds(opts.ids, done);
  console.log(
    `[pool2-measure] ${done.size} done, ${pending.length} pending` +
      ` (concurrency ${opts.concurrency})`,
  );
  // implements [FR-BENCH-SWE.CELLS](../../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
  // Every instance gets a row as it finishes — measured with its outcome, or
  // pending with the reason it was not fairly attempted. Writing rows here (not
  // at the end) is what keeps a killed run's record truthful.
  let healthAborts = 0;
  let backoffWaits = 0;
  const row = async (rec: TaskRecord) => {
    if (opts.cellDir) await appendTask(opts.cellDir, rec);
  };

  await mapPool(pending, opts.concurrency, async (id) => {
    const data = opts.data.get(id);
    if (!data) throw new Error(`no metadata for ${id}`);
    let prediction: Prediction;
    try {
      const attempt = await withHealthBackoff(() =>
        runArm(data, {
          arm,
          instanceIds: [],
          model: opts.model,
          outDir: opts.outDir,
          stepTimeoutMs: opts.stepTimeoutMs,
          repoRoot: opts.repoRoot,
          effort: opts.effort,
          ide: opts.ide,
          humanEmulatorModel: opts.humanEmulatorModel,
        }), {
        maxAttempts: opts.healthAttempts ?? DEFAULT_HEALTH_ATTEMPTS,
        sleep: opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
        onWait: (n, ms) => {
          healthAborts++;
          backoffWaits++;
          console.error(
            `  [pool2-measure] HEALTH-ABORT ${id} (exit 75) — waiting ${
              Math.round(ms / 1000)
            }s before attempt ${n + 1}`,
          );
        },
      });
      if (attempt.gaveUp) {
        // The host stayed overloaded for the whole budget — never ran, so leave
        // it pending for a later resume rather than banking a false miss.
        healthAborts++;
        console.error(
          `  [pool2-measure] HEALTH-ABORT ${id} — gave up after ${attempt.attempts} attempts, left pending`,
        );
        await row(
          taskRecordFromRun({
            rep: opts.rep,
            instanceId: id,
            code: 75,
            patch: "",
          }),
        );
        return null;
      }
      const res = attempt.result!;
      if (res.authFailed && !(res.prediction.model_patch ?? "").trim()) {
        // ACP token expired mid-batch — the model never engaged, so an empty
        // diff here is an infra artefact, not a genuine miss. Leave it pending
        // for a resume after re-login/refresh (distinct marker so the driver
        // can STOP on a sustained auth outage rather than spin like it does for
        // a transient load abort).
        console.error(
          `  [pool2-measure] AUTH-FAIL ${id} — left pending (re-login / token refresh)`,
        );
        await row(taskRecordFromRun({
          rep: opts.rep,
          instanceId: id,
          code: res.code,
          patch: "",
          authFailed: true,
          wallClockMs: res.wallClockMs,
          turns: res.turns,
        }));
        return null;
      }
      prediction = res.prediction;
      console.log(`  [pool2-measure] ${id} exit=${res.code}`);
      await row(taskRecordFromRun({
        rep: opts.rep,
        instanceId: id,
        code: res.code,
        patch: prediction.model_patch ?? "",
        wallClockMs: res.wallClockMs,
        turns: res.turns,
        patchPath: `rep${opts.rep}/${arm}.jsonl`,
      }));
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
        await row(taskRecordFromRun({
          rep: opts.rep,
          instanceId: id,
          code: 1,
          patch: "",
          setupFailed: true,
        }));
        return null;
      }
      console.error(`  [pool2-measure] FAILED ${id}: ${msg}`);
      prediction = toPrediction(id, arm, "");
      // A permanent failure (bad ref, missing metadata) DID consume the
      // instance's turn — record it as measured-with-nothing, not pending, or a
      // resume would retry it forever.
      await row(taskRecordFromRun({
        rep: opts.rep,
        instanceId: id,
        code: 1,
        patch: "",
      }));
    }
    await appendPrediction(opts.outDir, arm, prediction);
    return null;
  });
  return { predPath, healthAborts, backoffWaits };
}

/**
 * Grade a pool2 predictions file through the fork and return the set
 * of resolved instance ids. Test hunks are stripped first (agent-authored
 * tests are never the oracle — same rule as the princeton path); the stripped
 * file is written alongside as `<path>.graded.jsonl`.
 */
export async function gradePool2Predictions(
  predPath: string,
  split: string,
  runId: string,
  cwd: string = Deno.cwd(),
  /**
   * swebench's `model_name_or_path` — the arm. It is a path segment of the
   * verdict cache, so it must match what `applyVerdicts` reads back.
   */
  modelName: string = "baseline",
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
    modelName,
    runId,
    split,
    cwd,
  });
  return new Set(report.resolvedIds);
}
