/**
 * Pool2 selection: turn the 3 baseline reps (+ an Opus ceiling probe) into the
 * frozen measured-headroom pool of 20 (FR-BENCH-SWE.POOL2).
 *
 * Pipeline (pure functions here; the CLI wires them to on-disk rep data):
 *   1. assembleSonnetReps — per-instance 0..3 Sonnet resolved-rep count.
 *   2. zeroRepIds         — the 0/3 instances that need the Opus ceiling probe.
 *   3. buildHeadroom      — merge Sonnet reps + Opus verdicts into the
 *                           {sonnet_reps, opus_resolved} schema (opus null unless
 *                           Sonnet went 0/3, so the probe runs only where it can
 *                           change the keep decision).
 *   4. selectPool2        — apply the shared keep-rule (isHeadroomKeeper) and
 *                           freeze the cheapest-first N, minus excluded bad ids.
 *
 * Keep-rule rationale lives with `isHeadroomKeeper` below: keep an instance iff
 * our Sonnet is not already reliable (0 or 1 of 3) AND someone on our scaffold
 * can solve it (Sonnet ≥1 rep, or Opus) — i.e. real A/B headroom.
 */

import type { Pool2Candidate } from "./pool2_fetch.ts";

/**
 * Pool keep-rule: an instance belongs in the pool iff our subject arm is NOT
 * already reliable (resolved in 0 or 1 of 3 reps) AND it is solvable by someone
 * on our scaffold (subject resolved ≥1 rep, OR the ceiling arm resolved it).
 * Excludes always-solved (no headroom for flowai to demonstrate) and
 * nobody-solved (no ceiling, so a miss proves nothing).
 *
 * Written for the retired SWE-bench Verified pool and carried forward unchanged
 * — the rule is about headroom, not about which dataset supplied the rows.
 */
export function isHeadroomKeeper(
  m: { sonnet_reps: number; opus_resolved: boolean | null } | undefined,
): boolean {
  if (!m) return false;
  if (m.sonnet_reps === 1) return true;
  if (m.sonnet_reps === 0 && m.opus_resolved === true) return true;
  return false;
}

/** Per-instance headroom on our scaffold, mirroring measured_headroom.json. */
export interface Pool2Headroom {
  /** Count of baseline reps (0..3) whose Sonnet patch resolved the instance. */
  sonnet_reps: number;
  /** Opus ceiling verdict; null when Sonnet went ≥1/3 (probe skipped) or the
   * 0/3 probe has not run yet (see zeroRepsMissingOpus). */
  opus_resolved: boolean | null;
}

/**
 * Count, per instance, how many of the given rep solve-maps resolved it. Each
 * map is a rep's `solves.json` ({instance_id: resolved}). An id absent from a
 * rep counts as unresolved for that rep.
 */
export function assembleSonnetReps(
  reps: Array<Record<string, boolean>>,
): Record<string, number> {
  const ids = new Set<string>();
  for (const rep of reps) for (const id of Object.keys(rep)) ids.add(id);
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = reps.reduce((n, rep) => n + (rep[id] === true ? 1 : 0), 0);
  }
  return out;
}

/** Sorted ids Sonnet never resolved (0/3) — the Opus ceiling-probe queue. */
export function zeroRepIds(sonnetReps: Record<string, number>): string[] {
  return Object.keys(sonnetReps).filter((id) => sonnetReps[id] === 0).sort();
}

/**
 * Restrict a passer list to a requested subset (the `--instance` filter that
 * lets the Opus ceiling probe run only the 0/3 queue). Empty/undefined `wanted`
 * means no filter (all passers). Result keeps the passer order, not the request
 * order. Fails fast if any requested id is NOT a gate-passer — a typo'd id
 * would otherwise silently run nothing, which for a metered probe reads as a
 * (false) clean pass.
 */
export function filterToWanted(
  passers: string[],
  wanted: string[] | undefined,
): string[] {
  if (!wanted || wanted.length === 0) return passers;
  const passerSet = new Set(passers);
  const missing = wanted.filter((id) => !passerSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `--instance ids are not gate-passers: ${missing.join(", ")}`,
    );
  }
  const wantedSet = new Set(wanted);
  return passers.filter((id) => wantedSet.has(id));
}

/**
 * Merge Sonnet rep counts with Opus probe verdicts into the headroom schema.
 * `opus_resolved` is set ONLY for 0/3 instances (where the keep-rule consults
 * it); for ≥1/3 instances it is null (probe never needed). A 0/3 instance with
 * no verdict in `opusResolved` stays null and is reported by zeroRepsMissingOpus.
 */
export function buildHeadroom(
  sonnetReps: Record<string, number>,
  opusResolved: Record<string, boolean>,
): Record<string, Pool2Headroom> {
  const out: Record<string, Pool2Headroom> = {};
  for (const [id, reps] of Object.entries(sonnetReps)) {
    out[id] = {
      sonnet_reps: reps,
      opus_resolved: reps === 0 ? (opusResolved[id] ?? null) : null,
    };
  }
  return out;
}

/**
 * 0/3 instances still awaiting an Opus verdict. A non-empty result means the
 * ceiling probe is incomplete — freezing the pool now would wrongly reject
 * these as "no ceiling" purely because the probe has not run. The CLI gates the
 * freeze on this being empty.
 */
export function zeroRepsMissingOpus(
  headroom: Record<string, Pool2Headroom>,
): string[] {
  return Object.keys(headroom)
    .filter((id) =>
      headroom[id].sonnet_reps === 0 && headroom[id].opus_resolved === null
    )
    .sort();
}

/**
 * The selection verdict for one instance — the data-of-record's per-instance
 * outcome. Kept as a closed union so the report and integrity test can enumerate
 * every class, including the two rejection reasons (they are the "failed
 * variants" — an honest measurement records WHY an instance was dropped, not
 * only which survived).
 */
export type Pool2Verdict =
  | "keeper" // real A/B headroom (Sonnet 1/3, OR 0/3 with an Opus ceiling)
  | "reject_no_headroom" // Sonnet already reliable (2/3 or 3/3) — nothing to help
  | "reject_no_ceiling" // Sonnet 0/3 AND Opus also failed — unsolvable here
  | "excluded"; // un-gradeable / bad-data (e.g. unfetchable base ref)

/** A headroom entry annotated with its selection verdict (full data-of-record). */
export interface Pool2HeadroomEntry extends Pool2Headroom {
  verdict: Pool2Verdict;
}

/**
 * Classify one instance into its selection verdict. `excluded` (an un-gradeable
 * instance) overrides the measurement. Assumes a COMPLETE Opus probe for 0/3
 * instances — a 0/3 with `opus_resolved === null` (probe not run) is treated as
 * no-ceiling here, so callers must gate on `zeroRepsMissingOpus` being empty
 * first (a missing verdict is an incomplete measurement, not a real rejection).
 */
export function classifyInstance(
  m: Pool2Headroom,
  excluded: boolean,
): Pool2Verdict {
  if (excluded) return "excluded";
  if (isHeadroomKeeper(m)) return "keeper";
  if (m.sonnet_reps === 0) return "reject_no_ceiling";
  return "reject_no_headroom";
}

/**
 * Build the FULL selection data-of-record: every measured instance with its
 * Sonnet rep count, Opus verdict, and selection verdict — INCLUDING the rejected
 * and excluded ones. This is what gets persisted so a later reader can see not
 * just the pool but the whole funnel (why each instance stayed or dropped).
 */
export function buildHeadroomRecord(
  sonnetReps: Record<string, number>,
  opusResolved: Record<string, boolean>,
  exclude: ReadonlySet<string>,
): Record<string, Pool2HeadroomEntry> {
  const hr = buildHeadroom(sonnetReps, opusResolved);
  const out: Record<string, Pool2HeadroomEntry> = {};
  for (const [id, m] of Object.entries(hr)) {
    out[id] = { ...m, verdict: classifyInstance(m, exclude.has(id)) };
  }
  return out;
}

/** Count each verdict class across a headroom record (funnel summary). */
export function verdictSummary(
  record: Record<string, Pool2HeadroomEntry>,
): Record<Pool2Verdict, number> {
  const s: Record<Pool2Verdict, number> = {
    keeper: 0,
    reject_no_headroom: 0,
    reject_no_ceiling: 0,
    excluded: 0,
  };
  for (const e of Object.values(record)) s[e.verdict]++;
  return s;
}

/**
 * Apply the shared keep-rule and freeze the cheapest-first `n` keepers, dropping
 * any id in `exclude` (un-gradeable / bad-data instances). Cheapest-first =
 * gold-patch bytes then id (pool2 has no annotator difficulty label).
 */
export function selectPool2(
  headroom: Record<string, Pool2Headroom>,
  candidates: Pool2Candidate[],
  exclude: ReadonlySet<string>,
  n: number,
): Pool2Candidate[] {
  const byId = new Map(candidates.map((c) => [c.instanceId, c]));
  return Object.keys(headroom)
    .filter((id) => !exclude.has(id))
    .filter((id) => isHeadroomKeeper(headroom[id]))
    .map((id) => byId.get(id))
    .filter((c): c is Pool2Candidate => c !== undefined)
    .sort((a, b) =>
      a.patchBytes - b.patchBytes || a.instanceId.localeCompare(b.instanceId)
    )
    .slice(0, n);
}
