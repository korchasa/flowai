/**
 * No-LLM gold gates for the pool2 funnel (FR-BENCH-SWE.POOL2).
 *
 * A candidate is admitted to the (expensive) LLM baseline tier only after its
 * gold patch grades `resolved` k times in a row on this machine — one pass
 * proves arm64/Rosetta grading works for the instance, k=3 screens out flaky
 * tasks (SWE-bench-Live issue #47 method). Each rep is a full official
 * fork-harness evaluation with a distinct run_id (same-id runs would reuse
 * cached results and prove nothing).
 *
 * Results persist incrementally to `pool2_provenance.json` (committed) — the
 * data of record for WHY each candidate was kept or rejected; the model
 * snapshot + training cutoff fields are pinned later, at selection time.
 */

import { runRebenchEvaluation } from "./rebench.ts";
import { FORK_PINNED_COMMIT, REBENCH_DATASET } from "./rebench.ts";
import type { Pool2Candidate } from "./pool2_fetch.ts";

export const POOL2_PROVENANCE_PATH = "scripts/benchmark/pool2_provenance.json";

export interface GateResult {
  instanceId: string;
  split: string;
  /** Per-rep gold verdicts, in run order. */
  reps: boolean[];
  pass: boolean;
  /** Free-form failure note (e.g. harness error), absent on clean runs. */
  note?: string;
}

export interface Pool2Provenance {
  dataset: string;
  forkCommit: string;
  /** Gold-stability rep count the gates were run with. */
  k: number;
  /** Exact agent-model snapshot id — pinned at selection time. */
  modelSnapshot: string | null;
  /** Training cutoff of the pinned snapshot (vintage rule input). */
  trainingCutoff: string | null;
  /**
   * Reasoning effort the baseline measurement tier runs at — pinned identical
   * for baseline + flowai arms (the A/B differs only by flowai). Null until the
   * first measurement rep stamps it.
   */
  effort?: string | null;
  /**
   * Vintage boundary derived from {@link trainingCutoff}: admit only
   * candidates with `created_at` strictly after this date. Pinned at
   * selection time; read by the freeze-time integrity test.
   */
  vintageCut?: string | null;
  /** Human-readable statement of the vintage rule (documentation field). */
  vintageRule?: string;
  /**
   * Per-campaign pins, keyed by `<ide>/<model>@<effort>` (see
   * {@link campaignKey}).
   *
   * The gate results below are model-INDEPENDENT — the gold gate validates the
   * instance and its Docker image, never the agent — so several campaigns share
   * one gated candidate set. Their PINS do not: measuring codex/terra at
   * `medium` must not collide with the claude/sonnet campaign pinned at `high`.
   * The top-level `effort`/`modelSnapshot`/`trainingCutoff` fields above are the
   * original claude/sonnet campaign's record and are left frozen; every campaign
   * from 2026-07-25 on lives here (FR-BENCH-SWE.IDE).
   */
  campaigns?: Record<string, Pool2CampaignPins>;
  gates: Record<string, GateResult & { gatedAt: string }>;
}

/** Pins one measurement campaign: which agent ran, and at which effort. */
export interface Pool2CampaignPins {
  ide: string;
  model: string;
  effort: string;
}

/**
 * Identity of a measurement campaign: the full (ide, model, effort) triple.
 * Effort belongs in the identity because it is an operating point, not a
 * setting — terra at medium and terra at high produce different pass rates and
 * must never share one record. This is also what lets a ceiling probe coexist
 * with its subject (codex/gpt-5.6-sol@high alongside codex/gpt-5.6-terra@medium).
 *
 * Consequence, deliberately accepted: the provenance can no longer notice that
 * reps of ONE campaign blended two efforts, because a different effort is a
 * different key here. That protection lives at the campaign DIRECTORY instead
 * (`campaignMismatch`, pool2_measure.ts) — the correct scope, since one `--out`
 * base holds rep1..rep3 of exactly one campaign.
 */
export function campaignKey(
  ide: string,
  model: string,
  effort: string,
): string {
  return `${ide}/${model}@${effort}`;
}

/** Record this campaign's pins. Idempotent; never touches gate results. */
export function stampCampaign(
  prov: Pool2Provenance,
  ide: string,
  model: string,
  effort: string,
): Pool2Provenance {
  const key = campaignKey(ide, model, effort);
  const prior = prov.campaigns?.[key];
  if (prior && prior.effort === effort) return prov;
  return {
    ...prov,
    campaigns: { ...prov.campaigns, [key]: { ide, model, effort } },
  };
}

/** Pass iff exactly k reps ran and ALL resolved (flaky or incomplete → out). */
export function gateVerdict(reps: readonly boolean[], k: number): boolean {
  return reps.length === k && reps.every(Boolean);
}

export function emptyProvenance(k: number): Pool2Provenance {
  return {
    dataset: REBENCH_DATASET,
    forkCommit: FORK_PINNED_COMMIT,
    k,
    modelSnapshot: null,
    trainingCutoff: null,
    gates: {},
  };
}

/**
 * Load the provenance store; an absent file yields an empty store (the one
 * legitimate init path — before the first gate ever ran). Any other read or
 * parse error propagates.
 */
export async function loadProvenance(
  path: string,
  k: number,
): Promise<Pool2Provenance> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return emptyProvenance(k);
    throw e;
  }
  return JSON.parse(raw) as Pool2Provenance;
}

export async function saveProvenance(
  path: string,
  prov: Pool2Provenance,
): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(prov, null, 2) + "\n");
}

/** Record one gate result (same instance id overwrites — latest wins). */
export function upsertGate(
  prov: Pool2Provenance,
  result: GateResult,
  gatedAt: string,
): Pool2Provenance {
  return {
    ...prov,
    gates: { ...prov.gates, [result.instanceId]: { ...result, gatedAt } },
  };
}

/**
 * Ensure the candidate's prebuilt amd64 image is present locally (pull is
 * idempotent). A candidate without an image, or whose image cannot be pulled,
 * fails the gate explicitly — recorded, not skipped.
 */
async function pullImage(imageName: string, cwd: string): Promise<void> {
  const p = new Deno.Command("docker", {
    args: ["pull", "--platform", "linux/amd64", imageName],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await p.output();
  if (code !== 0) throw new Error(`docker pull failed for ${imageName}`);
}

/** Run the k-rep gold gate for one candidate through the official fork path. */
export async function runGoldGate(
  cand: Pool2Candidate,
  k: number,
  cwd: string = Deno.cwd(),
): Promise<GateResult> {
  if (cand.imageName === null) {
    return {
      instanceId: cand.instanceId,
      split: cand.split,
      reps: [],
      pass: false,
      note: "no prebuilt image in the dataset row",
    };
  }
  try {
    await pullImage(cand.imageName, cwd);
  } catch (e) {
    return {
      instanceId: cand.instanceId,
      split: cand.split,
      reps: [],
      pass: false,
      note: (e as Error).message,
    };
  }

  const reps: boolean[] = [];
  let note: string | undefined;
  for (let r = 1; r <= k; r++) {
    try {
      const rep = await runRebenchEvaluation({
        predictionsPath: "gold",
        runId: `pool2gate-${cand.instanceId}-r${r}`,
        modelName: "gold",
        split: cand.split,
        instanceIds: [cand.instanceId],
        cwd,
      });
      reps.push(rep.resolvedInstances === 1);
    } catch (e) {
      reps.push(false);
      note = (e as Error).message;
      break; // a harness error is terminal for this candidate, not flake data
    }
    if (reps.at(-1) === false) break; // one failed rep already rejects
  }
  const result: GateResult = {
    instanceId: cand.instanceId,
    split: cand.split,
    reps,
    pass: gateVerdict(reps, k),
  };
  if (note !== undefined) result.note = note;
  return result;
}
