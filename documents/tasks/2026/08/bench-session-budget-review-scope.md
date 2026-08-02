---
date: 2026-08-02
implements:
  - FR-BENCH-SWE.SYMMETRY
  - FR-BENCH-SWE.CELLS
status: in progress
---

# Session budget 40 min + review-turn scope bound (benchmark)

## Goal

Two hidden variables were sitting inside a "symmetric" harness and reading as
flowai's score. Remove both, then re-measure the arm on its merits.

## Overview

### Context

Three-rep flowai campaign over the frozen `codex-terra-medium` pool (15 keepers)
surfaced two harness artefacts:

1. **Budget.** `stepTimeoutMs` defaulted to 20 min for both arms. Baseline hit it
   in 0 of 198 sessions; flowai — one budget for plan → implement → review — in
   11 of 45. Symmetric on paper, asymmetric in effect.
2. **Review over-editing.** `reviewTurn` said "fix any gaps you find" and the
   emulator's `REVIEW —` line said "fixing what they find". Review edited code in
   91% of sessions; `pygraphistry-1277` and `schemathesis-3778` each went from a
   passing diff to a failing one. SWE-bench grades against a hidden P2P suite, so
   an unasked change can only lose.

User decision (2026-08-01): this is a BENCHMARK problem, not a product one — in
real work extra fixes improve things because a human and CI see them first. So
the bound goes in the harness's review invocation, NOT in
`framework/atoms/review.md`.

### Current State

- `SESSION_BUDGET_MS` = 2_400_000 exported from `scripts/benchmark/run.ts`; both
  `--step-timeout` flags in `scripts/benchmark.ts` import it.
- `reviewTurn` (`scripts/benchmark/operator.ts`) emits four bounded lines.
- `human_emulator.ts` `REVIEW —` reads "…fixing what the issue itself requires,
  and nothing else."
- Re-measurement of the 11 timed-out sessions at 40 min: 10 finished the cycle,
  score 10/45 → 9/45. Stable solves (≥2 of 3 reps): baseline 0, flowai 3, under
  both budgets.

### Constraints

- Framework `review` skill stays untouched (explicit user decision).
- Only sessions that actually hit the old cap were re-measured; faster ones kept.
- All future measurements at 40 min.

## Definition of Done

- [x] FR-BENCH-SWE.SYMMETRY: the session budget is one named constant both CLI
      flags share, not a literal duplicated per driver
  - Test: `scripts/benchmark/run.ts::SESSION_BUDGET_MS` imported by
    `scripts/benchmark.ts`
  - Evidence: `deno task benchmark pool2-run --help` prints `Default: 2400000`
- [x] FR-BENCH-SWE.SYMMETRY: `reviewTurn` forbids widening the diff beyond the
      issue and keeps the no-commit rule
  - Test: `scripts/benchmark/operator_test.ts::reviewTurn: bounds the fix to the
    issue instead of inviting a wider diff`
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the emulator's `REVIEW —` hand-off carries the same
      bound
  - Test: `scripts/benchmark/human_emulator_test.ts::operatorMessages: the REVIEW
    hand-off stays inside the issue's scope`
  - Evidence: `deno test -A scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.CELLS: the session budget is part of the cell key, and the
      blended flowai cell is split into a 20-minute and a 40-minute record
  - Test: `scripts/benchmark/cells_test.ts::cellId: the session budget is part
    of the key, legacy ids unchanged`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`; the two cells read
    10/45 measured and 2/11 measured + 34 pending
- [x] SRS + SDS record all three decisions and why the review bound is
      benchmark-only
  - Evidence: `deno task check` (exit 0)
- [ ] Re-measure the flowai arm at 40 min with the bounded review turn
  - Evidence: three reps of 15 in
    `scripts/benchmark/runs/pool2-flowai/rep{1,2,3}/flowai.jsonl`

## Solution

1. RED: two tests asserting the unbounded wording is gone. Both confirmed
   failing for the right reason before any edit.
2. GREEN: rewrite `reviewTurn`'s body and the emulator's `REVIEW —` description.
3. Extract `SESSION_BUDGET_MS` with the measurement that justifies 40 min in the
   doc comment; point both `--step-timeout` defaults at it.
4. Sync SRS FR-BENCH-SWE.SYMMETRY and SDS §3.22 (Arm prompting, Components).
5. Put the budget in the cell key (segment omitted for the legacy 20 min so no
   directory on disk is renamed) and split the blended cell along the seam.
6. Re-measure — still open.
