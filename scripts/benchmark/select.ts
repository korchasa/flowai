/**
 * Candidate selection for the flowai-core SWE-bench benchmark (FR-BENCH-SWE).
 *
 * The benchmark targets instances the *published* Claude-Sonnet baseline failed
 * to resolve (sonnet-unsolved), ordered cheapest-first so we exhaust the easy
 * wins before the expensive ones. Baseline is never re-run — every instance
 * flowai resolves here is a direct beat over the published sonnet result.
 *
 * Pure selection logic; the committed `candidates.json` is its output over the
 * real dataset + `sonnet_baseline.json`. Regenerate via `benchmark select`.
 */

/** Per-instance metadata extracted from the SWE-bench Verified dataset. */
export interface InstanceMeta {
  instance_id: string;
  repo: string;
  /** Annotator `difficulty` label, e.g. "<15 min fix". */
  difficulty: string;
  /** Gold-patch size in bytes — the cheap-first tiebreaker. */
  patch_bytes: number;
  /** Count of FAIL_TO_PASS tests. */
  f2p: number;
}

/** A selected benchmark candidate (camelCase view of InstanceMeta). */
export interface Candidate {
  instanceId: string;
  repo: string;
  difficulty: string;
  patchBytes: number;
  f2p: number;
}

/** SWE-bench Verified annotator difficulty labels in ascending cost order. */
export const DIFFICULTY_RANK: Record<string, number> = {
  "<15 min fix": 0,
  "15 min - 1 hour": 1,
  "1-4 hours": 2,
  ">4 hours": 3,
};

/** Rank a difficulty label; unknown labels sort last. */
export function difficultyRank(d: string): number {
  return DIFFICULTY_RANK[d] ?? 99;
}

/** Stable cheapest-first order: difficulty, then gold-patch bytes, then id. */
function cheapFirst(a: Candidate, b: Candidate): number {
  return difficultyRank(a.difficulty) - difficultyRank(b.difficulty) ||
    a.patchBytes - b.patchBytes ||
    a.instanceId.localeCompare(b.instanceId);
}

function toCandidate(m: InstanceMeta): Candidate {
  return {
    instanceId: m.instance_id,
    repo: m.repo,
    difficulty: m.difficulty,
    patchBytes: m.patch_bytes,
    f2p: m.f2p,
  };
}

/**
 * Sonnet-unsolved, arm64-buildable candidates, cheapest-first.
 * Drops instances the baseline already resolved and repos on the deny-list
 * (heavy C-extension builds that fail on Apple Silicon), then sorts by
 * (difficulty, gold-patch bytes, id) for a deterministic cheap-first queue.
 */
export function selectCandidates(
  meta: InstanceMeta[],
  resolved: ReadonlySet<string>,
  deny: ReadonlySet<string>,
): Candidate[] {
  return meta
    .filter((m) => !resolved.has(m.instance_id))
    .filter((m) => !deny.has(m.repo))
    .map(toCandidate)
    .sort(cheapFirst);
}

/**
 * High-confidence "pure Claude Code + Sonnet likely fails" pool, cheapest-first.
 * Intersects two published failure sets — a STRONGER Claude Code config
 * (Opus 4.5 + vexp) AND the tools-Sonnet submission (same model, simpler
 * scaffold) — so an instance both failed is near-certain to defeat plain
 * Claude Code + Sonnet too. arm64-buildable only. The pool merely makes the
 * self-run baseline efficient; we still MEASURE pure-CC+Sonnet ourselves.
 */
export function selectPool(
  meta: InstanceMeta[],
  ccFailed: ReadonlySet<string>,
  sonnetResolved: ReadonlySet<string>,
  deny: ReadonlySet<string>,
): Candidate[] {
  return meta
    .filter((m) => ccFailed.has(m.instance_id))
    .filter((m) => !sonnetResolved.has(m.instance_id))
    .filter((m) => !deny.has(m.repo))
    .map(toCandidate)
    .sort(cheapFirst);
}
