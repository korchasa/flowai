---
date: "2026-06-30"
status: to do
implements: [FR-ATOM-IMPLEMENT, FR-AI-CODE-REVIEW]
tags: [review-skill, implement-skill, existing-tests, false-green, swe-bench, finding]
related_tasks: [2026/06/plan-reco-root-cause-ranking.md]
---
# implement/review must run the repo's EXISTING tests, not only self-authored ones

## Goal

Kill the false-green pattern: the agent writes its own tests for its own (wrong)
fix, runs only those, and `review` approves. Make `implement` (CHECK) and
`review` run the repository's EXISTING test suite covering the changed area, so a
fix that passes self-authored tests but breaks/ignores the canonical suite is
caught.

## Overview

### Context

From the SWE-bench Verified run (documents/benchmarks/swe-verified-2026-06-30.md,
breakdown #3). On django__django-14792 the hidden FAIL_TO_PASS lived in
`utils_tests.test_timezone`. The agent never ran it: it wrote 6 self-authored
tests for `_prepare_tzname_delta` asserting its own expectation, ran only those,
and `/review` returned "Approve" against them. The canonical suite that would
have failed was never executed. Same shape risks recurring on any instance where
the agent's mental model is wrong but internally consistent.

### Current State

- `framework/atoms/implement.md` (→ `.../skills/implement/SKILL.md`): TDD cycle
  RED→GREEN→REFACTOR→CHECK. CHECK runs the project check, but nothing forces
  running the repo's PRE-EXISTING tests covering the changed symbols (only the
  new RED test is guaranteed).
- `framework/atoms/review.md` (→ `.../skills/review/SKILL.md`): reviews the diff +
  synthesizes ephemeral JiT tests, but does not require locating and running the
  repo's existing suite for the changed area as an approval gate.

### Constraints

- Workflow-primitive change (implement and/or review) with benchmark coverage →
  Acceptance-Test TDD (RED scenario first). Surface ≥2 variants before editing
  (done below).
- Must degrade gracefully when the existing suite can't run locally (e.g. needs a
  live DB) — discover and run what CAN run; do not fabricate a pass. "fail fast,
  fail clearly" per AGENTS.md.
- Do not turn review into a full-suite CI run; scope to the CHANGED area.

## Variants

### Variant A — Review-side gate [recommended]
`review` gains a mandatory step: identify the repo's existing test module(s) for
the changed symbols and RUN them; block an "Approve" verdict if the existing
suite for the changed area was not executed (or explicitly record why it could
not run). Self-authored tests alone never satisfy the gate.
- Pros: catches false-green at the last gate regardless of how implement behaved;
  single skill change.
- Cons: later in the cycle — wasted implement effort before the catch.
- Risks: low; review already runs tests.

### Variant B — Implement-side CHECK extension
`implement` CHECK must run the repo's existing tests covering the changed symbols
(discovered from the changed files), not only the new RED test, before declaring
GREEN.
- Pros: catches the problem earliest, inside the TDD loop.
- Cons: doesn't protect against a review that re-approves stale state; implement
  may mis-scope "covering tests".
- Risks: low-medium.

### Variant C — Both (implement CHECK + review gate)
Implement runs existing covering tests in CHECK; review independently verifies
existing-suite execution as an approval gate.
- Pros: defense in depth — earliest catch + final gate.
- Cons: two skill changes; more benchmark scenarios; some duplication.
- Risks: medium (scope).

## Definition of Done

(Filled after variant selection. Each item will pair FR + acceptance tuple.)

- [ ] FR-AI-CODE-REVIEW (and/or FR-ATOM-IMPLEMENT): the chosen skill runs the
      repository's existing tests for the changed area and refuses a green/approve
      verdict when only self-authored tests were run.
  - Test: `Benchmark: review-runs-existing-suite-blocks-false-green` (to be authored, RED first)
  - Evidence: `deno task acceptance-tests -f review-runs-existing-suite`

## Solution (Variant A — review-side gate)

1. **RED** — author benchmark scenario
   `framework/core/skills/review/acceptance-tests/runs-existing-suite/mod.ts`:
   a diff whose self-authored tests pass but whose changed symbols are covered by
   an EXISTING repo test module that was not run (and would not all pass).
   Checklist (observable behaviour): review locates the existing test module(s)
   for the changed symbols, runs them, and does NOT emit "Approve" when only
   self-authored tests were executed (or explicitly records why the existing
   suite could not run). Run — it MUST fail on current `review.md`.
2. **GREEN** — edit `framework/atoms/review.md`: add a mandatory step before the
   verdict — "identify the repository's existing test module(s) covering the
   changed symbols and RUN them. An 'Approve' verdict is forbidden when only
   self-authored tests were run; if the existing suite cannot run locally (e.g.
   needs a live service), record that explicitly — never fabricate a pass." Then
   regenerate composites: `deno run -A scripts/generate-skill-composites.ts
   --write` (review is an atom consumed by `review-and-commit`/`ship`/`ship-task`).
3. **REFACTOR** — keep scope to the CHANGED area (not a full-suite CI run).
4. **CHECK** — run the new scenario; hand off the full review-primitive sweep
   (`deno task acceptance-tests -f review`) to the user.

Note: `review.md` is a generator atom — edit the atom, never the generated
SKILL.md. Defer the implement-side CHECK extension (Variant B) to a follow-up if
the review gate alone proves insufficient.
