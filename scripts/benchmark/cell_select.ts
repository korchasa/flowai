/**
 * Pool selection from result cells (FR-BENCH-SWE.CELLS, FR-BENCH-SWE.POOL2).
 *
 * The keep-rule (user, 2026-07-26 — the same one the Sonnet pool froze under):
 * an instance is worth measuring flowai on only where the subject model is
 * UNSTABLE (exactly one solve in three reps) or helpless-but-not-hopeless
 * (never solves, yet the ceiling model does). What the subject solves twice or
 * more has no headroom to show; what nobody solves has no ceiling to reach.
 *
 * Two verdicts exist purely so nothing is dropped in silence:
 *   - `incomplete` — the subject has not finished its reps for that instance,
 *     so one more rep could move it from keeper to reject;
 *   - `undecided_no_ceiling_run` — the subject never solved it and the ceiling
 *     was never run on it, so the question is open, not answered "no".
 * Both stay OUT of the pool and are reported, never quietly folded into a
 * rejection.
 */

import type { Cell } from "./cells.ts";

export type SelectionVerdict =
  | "keeper_unstable"
  | "keeper_ceiling"
  | "reject_no_headroom"
  | "reject_no_ceiling"
  | "undecided_no_ceiling_run"
  | "incomplete"
  | "excluded";

export interface SubjectTally {
  solves: number;
  measured: number;
}

/** Solves and measured-rep count per instance; pending reps do not count. */
export function subjectTally(
  cell: Cell,
  reps: readonly number[],
): Map<string, SubjectTally> {
  const out = new Map<string, SubjectTally>();
  for (const t of cell.tasks) {
    if (!reps.includes(t.rep) || t.status !== "measured") continue;
    const cur = out.get(t.instanceId) ?? { solves: 0, measured: 0 };
    cur.measured++;
    if (t.verdict?.resolved) cur.solves++;
    out.set(t.instanceId, cur);
  }
  return out;
}

/**
 * Verdict for one instance. `ceiling` is true/false when the ceiling model was
 * run on it, null when it never was.
 */
export function classifyFromCells(
  subject: SubjectTally,
  ceiling: boolean | null,
  requiredReps: number,
): SelectionVerdict {
  if (subject.measured < requiredReps) return "incomplete";
  if (subject.solves >= 2) return "reject_no_headroom";
  if (subject.solves === 1) return "keeper_unstable";
  if (ceiling === null) return "undecided_no_ceiling_run";
  return ceiling ? "keeper_ceiling" : "reject_no_ceiling";
}

export interface SelectionInstance {
  instanceId: string;
  subjectSolves: number;
  subjectMeasured: number;
  ceilingSolved: boolean | null;
  verdict: SelectionVerdict;
  excludedReason?: string;
}

export interface Selection {
  subjectCellId: string;
  ceilingCellId: string;
  rule: string;
  subjectReps: number[];
  ceilingReps: number[];
  pool: string[];
  counts: Record<SelectionVerdict, number>;
  instances: SelectionInstance[];
}

export interface BuildSelectionOptions {
  subject: Cell;
  ceiling: Cell;
  subjectReps: number[];
  ceilingReps: number[];
  subjectCellId: string;
  ceilingCellId: string;
}

const RULE =
  "keep iff the subject solves exactly 1 of N reps, or solves 0 and the " +
  "ceiling model solves at least once";

/** Apply the keep-rule across two cells and return the full funnel. */
export function buildSelection(opts: BuildSelectionOptions): Selection {
  const tally = subjectTally(opts.subject, opts.subjectReps);
  const excluded = new Map<string, string>();
  for (const t of opts.subject.tasks) {
    if (t.status === "excluded") {
      excluded.set(t.instanceId, t.excludedReason ?? "excluded");
    }
  }
  if (tally.size === 0 && excluded.size === 0) {
    throw new Error(
      `subject cell ${opts.subjectCellId} has no instance measured in reps ` +
        `${opts.subjectReps.join(",")} — nothing to select from`,
    );
  }

  const ceilingTally = subjectTally(opts.ceiling, opts.ceilingReps);
  const ids = [...new Set([...tally.keys(), ...excluded.keys()])].sort();

  const instances: SelectionInstance[] = ids.map((id) => {
    const s = tally.get(id) ?? { solves: 0, measured: 0 };
    const c = ceilingTally.get(id);
    const ceilingSolved = c === undefined ? null : c.solves > 0;
    const reason = excluded.get(id);
    const verdict: SelectionVerdict = reason !== undefined
      ? "excluded"
      : classifyFromCells(s, ceilingSolved, opts.subjectReps.length);
    const rec: SelectionInstance = {
      instanceId: id,
      subjectSolves: s.solves,
      subjectMeasured: s.measured,
      ceilingSolved,
      verdict,
    };
    if (reason !== undefined) rec.excludedReason = reason;
    return rec;
  });

  const counts = {
    keeper_unstable: 0,
    keeper_ceiling: 0,
    reject_no_headroom: 0,
    reject_no_ceiling: 0,
    undecided_no_ceiling_run: 0,
    incomplete: 0,
    excluded: 0,
  } as Record<SelectionVerdict, number>;
  for (const i of instances) counts[i.verdict]++;

  return {
    subjectCellId: opts.subjectCellId,
    ceilingCellId: opts.ceilingCellId,
    rule: RULE,
    subjectReps: opts.subjectReps,
    ceilingReps: opts.ceilingReps,
    pool: instances
      .filter((i) =>
        i.verdict === "keeper_unstable" || i.verdict === "keeper_ceiling"
      )
      .map((i) => i.instanceId),
    counts,
    instances,
  };
}
