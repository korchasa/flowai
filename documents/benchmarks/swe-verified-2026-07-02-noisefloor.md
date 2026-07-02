# SWE-bench Verified — noise-floor measurement (flowai pipeline, unchanged atoms)

- Date: 2026-07-02 (supersedes the interpretation of `swe-verified-2026-07-02-loop1.md`; that
  report's per-instance data stands as rep 1 here).
- Purpose: measure the run-to-run variance of the CURRENT flowai pipeline (no atom edits) so that
  future text-level edits are judged against a real noise floor, not single-rep deltas.
- Harness: Claude Code + `sonnet` over ACP, operator-driven gate — identical to loop1.
- Design: 3 reps of the full 13-instance pool on a byte-identical pipeline. Rep 1 = `2026-07-02-loop1`
  (atoms verified semantically unchanged since; the sandbox consumes pre-rendered committed
  SKILL.md composites, so the interim review.md reflow never reaches the agent). Reps 2–3 =
  `2026-07-02-noisefloor` (run-ids `nf-rep2`, `nf-rep3`). Full audit + critic gates (2 design
  rounds) in `scripts/benchmark/runs/2026-07-02-noisefloor/_decision-log.md`.

## Result: the pipeline is non-deterministic; single-rep ±1 deltas are noise

Per-instance verdict across the three identical-pipeline reps:

- `django-14792`: fail / **resolve** / **resolve** — flips (also resolved in the pre-edit skillfix run).
- `django-13195`: fail / **resolve** / fail — flips between the two co-temporal reps (rep2↔rep3).
- `django-11820`, `12325`, `16256`, `16263`, `16667`, `pylint-4551`, `sphinx-7462`, `7748`,
  `sympy-16597`, `20428`: fail / fail / fail — stable.
- `django-13513`: empty patch in all three reps — stable agent decision, ungraded.

Aggregate resolved count per rep: **0 / 2 / 1**. Spread of 2 on a pipeline that did not change.

## What this establishes

1. **Non-determinism is proven, not inferred.** `django-13195` resolves in rep2 and fails in
   rep3 — both reps are co-temporal and agent-visible-byte-identical, so the flip cannot be a
   provenance artifact; it is pure run-to-run sampling. `django-14792` corroborates.
2. **Iteration 1's headline was noise.** The whole "1/13 → 0/12 after the plan outcome-completeness
   edit" story sits entirely inside the 0–2 same-day spread of the UNCHANGED pipeline. On this pool
   a ±1 single-rep aggregate delta carries no information about an edit.
3. **Noise floor.** A text edit must move the resolved count by more than ~2 (same-day) to clear
   sampling; because reps 2–3 ran in one ~2.5h window, this is a LOWER bound — a cross-day A/B
   (edit, then re-run later) faces more variance, so the real bar is higher. No single edit in
   iterations 1–2 approached it.
4. **Stable substrate for real A/B.** 10 stable-fail + 1 stable-empty instances are p≈0 anchors:
   a genuine fix is one that flips a stable-fail instance to a stable-resolve ACROSS reps. The two
   flaky instances (`14792`, `13195`) must be excluded from edit-efficacy judgments — they are coins.

## Consequence for the improvement loop

The loop is terminated (condition a — no critic-surviving fix candidate at gate 1; condition b now
confirmed with evidence — the metric cannot improve at this precision). Per the user's standing bar
("small changes that can hide between runs are not interesting"), text-level iteration on a
13-instance single-rep pool is below the measurement threshold by construction.

Human decision for the next phase (scope/budget):
- **(a)** Enlarge the pool to ~40–50 instances so a real 2–3 instance effect shows as a ≥5–7%
  shift that clears noise without repetition.
- **(b)** Adopt multi-rep majority-resolve per instance as the standing metric (≥3 reps, cost ×3).
- **(c)** Judge edits by mechanism on the stable-fail anchors (did the agent start doing X on
  `11820`?) rather than by the aggregate count.

## Caveats

- Same-day window for reps 2–3 → the measured floor is a lower bound on real (cross-day) noise.
- Model temperature is not pinned by the harness (default `sonnet` sampling); the floor is valid
  at that setting.
- `django-13513`'s empty patch is a stable agent verdict, not a flake — excluded from grading in
  all reps.
- Pool is Python-only and deliberately hard (all baseline failures); the floor is specific to this
  pool's difficulty mix.
