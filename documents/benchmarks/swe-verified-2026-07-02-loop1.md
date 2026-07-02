# SWE-bench Verified — flowai re-measure after plan outcome-completeness (loop iteration 1)

- Date: 2026-07-02 (same day as the prior A/B; supersedes `swe-verified-2026-07-02.md` as the latest measurement)
- Harness: Claude Code + `sonnet` over ACP, operator-driven gate — identical to the prior run.
- Pool: the full 13-instance pool (`scripts/benchmark/pool.json`); flowai arm only (baseline unchanged from the same-day A/B: 0/13).
- Pipeline delta vs prior run: ONE change — the `plan` atom outcome-completeness edits (`dabe5744`, FR-PLAN-OUTCOME-COMPLETENESS: DoD seeded from stated outcomes, affected-surface enumeration, scope-cut transparency + Follow-ups, post-triage completeness check).
- Run artifacts: `scripts/benchmark/runs/2026-07-02-loop1/` (incl. `_decision-log.md` — full critic-gate audit trail).

## Result

- **flowai: 0/12 resolved** (12 graded, 0 grading errors; `django__django-13513` produced an empty patch 3 consecutive times incl. both prior arms — ungraded `—`, treated as stable "no change" behavior).
- Prior same-harness run (without the outcome-completeness edit): **1/13** (`django__django-14792`).
- Net single-rep delta: **−1**. No evidence the outcome-completeness edit improves resolve rate.

## The headline finding: recommendation instability, not a text-rule effect

`django__django-14792` — the instance the plan-ranking rule (`cac00793`) won last run — flipped back to the symptom patch:

- The plan phase KNEW the root site (`_get_timezone_name` mentioned 23× in the transcript), surfaced a root variant, and still recommended Variant 1 — `_prepare_tzname_delta` in `db/backends/*/operations.py`. The operator gate authorized the recommendation, implement built the symptom fix, review approved it.
- Same instance, same atom carrying the ranking rule, opposite recommendation across two runs. The ranking rule's effect is NOT stable at n=1; run-to-run variance dominates deltas of this magnitude (0–1 resolved on a deliberately hard, all-baseline-failure pool).

## Honest read

1. **No efficacy evidence for the outcome-completeness edit.** Both its acceptance scenarios pass on the UNCHANGED atom (regression-guards with a documented RED-first waiver — see the FR note), so the benchmark was the only efficacy channel, and it shows 1 → 0. The edit was derived from 11 analyzed failures (training-on-test risk was declared upfront); its retro-fit of those failures did not translate into fresh wins.
2. **Loop-termination signal armed.** Per the improvement-loop rules: resolved count failed to improve (1st consecutive non-improvement). One more non-improving iteration → the loop stops and hands back to the human. The same-atom-3rd-edit guard is also one step from firing (plan atom edited twice: `cac00793`, `dabe5744`).
3. **The lever is measurement, not more plan text.** Two consecutive runs demonstrate that single-rep signals on this pool cannot distinguish a working text rule from noise. Options for the next human decision: (a) multi-rep evaluation (e.g. 3 reps per instance, majority resolve) to get a signal above the noise floor before any further primitive edits; (b) shift to the review/oracle follow-up (independent expectation reconstruction), which targets the failure subset text-completeness cannot reach (11820, 7748, 20428); (c) accept the pool is too hard/noisy for text-level iteration and re-select a wider pool.
4. **Environment note.** The first re-measure attempt (overnight) was voided by expired Claude Code auth (12/13 empty patches, `Authentication required`) — detected by the loop's environment-failure rule and excluded from analysis; the graded run above is post-recovery with 12/13 real patches.

## Per-instance (loop1 vs prior)

- Resolved: none this run (prior: `django-14792` only).
- `django-14792`: real patch, wrong site (symptom backends patch — see above).
- `django-11820`, `12325`, `13195`, `16256`, `16263`, `16667`, `pylint-4551`, `sphinx-7462`, `7748`, `sympy-16597`, `20428`: real patches, unresolved (per-instance reports under `logs/run_evaluation/loop1/flowai/`).
- `django-13513`: `—` (empty patch ×3 — consistent agent verdict, matches both arms of the prior run).

## Caveats

- Single-rep, hard pool (all instances are baseline failures except the one empty-patch case) — 0–1 resolved differences carry heavy noise; conclusions above are about *stability*, not about the edit being harmful.
- Same-harness comparison is clean: only the atom edit differs from the 1/13 run.
- The full decision audit (3 critic gates, 6 subagent rounds, 19 objections: 18 applied / 1 partially rebutted; both RED attempts passing pre-change; auth incident) is in `scripts/benchmark/runs/2026-07-02-loop1/_decision-log.md`.
