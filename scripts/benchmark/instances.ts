/**
 * Candidate instance set for the flowai-core SWE-bench benchmark (FR-BENCH-SWE).
 *
 * The A/B target is a measured-headroom POOL selected on OUR scaffold (pure
 * Claude Code) — see `measured_headroom.json` and `isHeadroomKeeper`.
 *
 * Data of record (committed):
 *   - measured_headroom.json — per-instance {sonnet_reps 0–3, opus_resolved} on
 *                              our scaffold; the pool integrity check.
 *   - pool.json              — the keeper set, cheapest-first.
 *   - candidates.json        — sonnet-unsolved, arm64-buildable expand-source.
 *   - sonnet_baseline.json   — published Sonnet resolved-id set; used ONLY to
 *                              filter the candidates queue (`selectCandidates`).
 *
 * Source of truth: documents/requirements.md FR-BENCH-SWE, documents/design.md §3.22.
 */

import type { Candidate } from "./select.ts";
import candidatesData from "./candidates.json" with { type: "json" };
import baselineData from "./sonnet_baseline.json" with { type: "json" };
import poolData from "./pool.json" with { type: "json" };
import headroomData from "./measured_headroom.json" with { type: "json" };

export type { Candidate } from "./select.ts";

/**
 * Per-instance headroom measured on OUR scaffold (pure Claude Code): Sonnet
 * resolved-rep count (0..3) and the Opus verdict (true/false, or null when Opus
 * was skipped because Sonnet already solved it at least once). This is the data
 * of record the POOL is derived from — see `measured_headroom.json`. Supersedes
 * the retired third-party published submissions, whose different scaffold
 * mispredicted our arm's actual capability frontier.
 */
export const MEASURED_HEADROOM: Record<
  string,
  { sonnet_reps: number; opus_resolved: boolean | null }
> = headroomData.instances as Record<
  string,
  { sonnet_reps: number; opus_resolved: boolean | null }
>;

/**
 * POOL keep-rule (matches `measured_headroom.json` provenance): an instance
 * belongs in the pool iff our Sonnet is NOT already reliable (resolved in 0 or 1
 * of 3 reps) AND it is solvable by someone on our scaffold (Sonnet resolved ≥1
 * rep, OR Opus resolved it). Excludes always-solved (no headroom) and
 * nobody-solved (no ceiling) instances.
 */
export function isHeadroomKeeper(
  m: { sonnet_reps: number; opus_resolved: boolean | null } | undefined,
): boolean {
  if (!m) return false;
  if (m.sonnet_reps === 1) return true;
  if (m.sonnet_reps === 0 && m.opus_resolved === true) return true;
  return false;
}

/**
 * Repos excluded from candidate selection: heavy pinned C-extension builds that
 * fail on arm64 (Apple Silicon) swebench Docker images. Mirrors the deny-list
 * applied when generating candidates.json.
 */
export const ARM64_DENY: readonly string[] = [
  "matplotlib/matplotlib",
  "astropy/astropy",
  "scikit-learn/scikit-learn",
  "mwaskom/seaborn",
];

/** Published Claude-Sonnet baseline provenance + resolved-id set. */
export const SONNET_BASELINE: {
  source: string;
  runId: string;
  dataset: string;
  resolvedCount: number;
} = {
  source: baselineData.source,
  runId: baselineData.run_id,
  dataset: baselineData.dataset,
  resolvedCount: baselineData.resolved_count,
};

/** Instance ids the published sonnet baseline resolved (filters the candidates queue). */
export const SONNET_RESOLVED: ReadonlySet<string> = new Set(
  baselineData.resolved,
);

/** Cheapest-first queue of sonnet-unsolved, arm64-buildable candidates. */
export const CANDIDATES: readonly Candidate[] = candidatesData as Candidate[];

/**
 * Measured-headroom A/B pool (cheapest-first): instances that pass
 * `isHeadroomKeeper` over `measured_headroom.json` — our Sonnet resolves them in
 * 0–1 of 3 reps AND someone solves them on our scaffold (Sonnet ≥1 rep or our
 * Opus). Excludes always-solved (no headroom) and nobody-solved (no ceiling).
 * Selected by measuring our OWN scaffold, not a third-party published submission.
 */
export const POOL: readonly Candidate[] = poolData as Candidate[];

/** All pool instance ids, cheapest-first. */
export function poolIds(): string[] {
  return POOL.map((c) => c.instanceId);
}

/** Candidate lookup by instance id (POOL first, then the cheap candidate queue). */
export function candidateById(id: string): Candidate | undefined {
  return POOL.find((c) => c.instanceId === id) ??
    CANDIDATES.find((c) => c.instanceId === id);
}

/** The cheapest `n` candidate ids (the default run queue). */
export function cheapestIds(n: number): string[] {
  return CANDIDATES.slice(0, n).map((c) => c.instanceId);
}

/** All candidate ids in cheap-first order. */
export function allCandidateIds(): string[] {
  return CANDIDATES.map((c) => c.instanceId);
}
