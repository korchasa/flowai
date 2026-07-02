---
date: "2026-07-02"
status: to do
implements: [FR-PLAN-OUTCOME-COMPLETENESS]
tags: [plan, benchmark, completeness, dod]
related_tasks: [2026/06/plan-reco-root-cause-ranking.md, 2026/06/review-run-existing-tests.md]
---

# Plan Outcome Completeness: seed DoD from the request, enumerate affected surface, no silent scope cuts

## Goal

Stop the dominant SWE-bench failure family (INCOMPLETE_FIX, 9–10/11 in the 2026-07-02 run): plans that under-capture the request's stated outcome set and affected surface, or silently drop a seen-but-inconvenient requirement. Domain-general: the same failure exists in infrastructure (migrated primary, backup job left on the old host) and non-IT plans (re-planned schedule, escalation doc never updated).

## Overview

### Context

Root-cause investigation of 11 failed flowai SWE-bench sessions (see `scripts/benchmark/runs/2026-07-02-loop1/_decision-log.md`, gate-1/gate-2 critic rounds). Two levers land in `plan`: (A) requirement/surface under-capture (~7/11 — e.g. django-16667 invented its own output literal instead of the issue's `"0-0-0"`; sphinx-7462 fixed one of two duplicated `unparse` sites); (B) silent scope cuts (django-13195/16256 — the wider requirement was SEEN and dropped as "out of ticket scope" without surfacing the cut). Review-side dismissal rigor and the independent-oracle gap are follow-ups, NOT this task.

### Current State

`framework/atoms/plan.md` (172 lines): Step 3 writes DoD as "placeholder bullets — fill in step 5a"; Step 2 has no affected-surface requirement; Step 4 variants have no obligation to name dropped outcomes; no completeness check maps stated outcomes to the task file. Atom renders into `plan` skill + `ship` composite (581/700 lines).

### Constraints

- Domain-neutral wording only (code / infrastructure / non-IT examples inline) — discriminator: must help on an infra task and a non-IT task with a human on the gate, not only on a code issue with a hidden test.
- Conditional engagement: disciplines fire only when the request has a definite outcome set; open-ended requests route to the existing clarifying-question gate.
- Scope choice stays with the human: transparency requirements, never a full-coverage invariant.
- Keep additions compact: `ship` composite must stay under 700 lines (+~18 lines OK).
- Critic-gate approved wording (2 rounds, 0 BLOCKING remaining) — see decision log 04:47/04:55 entries.

## Definition of Done

- [ ] FR-PLAN-OUTCOME-COMPLETENESS (pre-gate half): plan seeds DoD from the request's stated outcomes (verbatim expected values), enumerates the affected surface proactively (undisclosed duplicated site), names dropped outcomes in variant Cons; verified RED→GREEN.
  - Test: `Benchmark: plan-dod-covers-stated-outcomes`
  - Evidence: `deno task acceptance-tests -f plan-dod-covers-stated-outcomes`
- [ ] FR-PLAN-OUTCOME-COMPLETENESS (post-selection half): after an explicit user scope cut, dropped outcomes are recorded under `## Follow-ups` in the task file and the Step-7 completeness check maps every stated outcome to DoD/Solution/Follow-ups; verified RED→GREEN.
  - Test: `Benchmark: plan-records-dropped-outcomes`
  - Evidence: `deno task acceptance-tests -f plan-records-dropped-outcomes`
- [ ] FR-PLAN-OUTCOME-COMPLETENESS: add FR section to SRS with `**Acceptance verified by acceptance tests:**` field; register row in `documents/index.md`; SRS `**Tasks:**` back-pointer.
  - Test: `manual — SRS/index diff in this task's commit`
  - Evidence: `deno task check` (check-salp, check-fr-coverage, check-srs-evidence pass)
- [ ] No regression across the plan primitive's existing scenarios.
  - Test: full plan sweep
  - Evidence: `deno task acceptance-tests -f plan-` (all scenarios pass or cached-pass)

## Solution

Critic-approved revision 2 — four edits to `framework/atoms/plan.md`:

1. **Step 2 (before the STOP bullet)** — affected-surface enumeration, conditional on a definite outcome set; per-domain examples (code: callers/duplicated logic; infra: environments, regions, dependent services, scheduled jobs; non-IT: affected people, downstream steps); depth proportional to blast radius (classes for wide surfaces); each item/class covered or excluded with inspected evidence; open-ended requests route to clarifying questions.
2. **Step 3 (rewrite the DoD line)** — seed one DoD bullet per stated outcome in the request's own terms; preserve concrete expected results exactly; related outcomes may collapse when one acceptance check proves them all; placeholder fallback when no discrete outcomes; tuples still added in 5a.
3. **Step 4 (append)** — scope-cut transparency: variants covering less than the stated outcome set name the dropped outcomes in Cons; an outcome must appear in ≥1 variant or be explicitly named as deferred at selection time; after selection, dropped outcomes of the chosen variant are recorded under `## Follow-ups`; silent drops are planning defects; the scope choice is made at variant selection on visible information.
4. **Step 7 (append)** — completeness check after triage: every seeded outcome and surface item maps to a DoD item, Solution step, or `## Follow-ups` entry with a reason; complements Rule 8 (tuple check); the task file is the record.
5. **Verification block** — one new checkbox covering 3+4.

Then: regenerate composites, RED→GREEN on `plan-dod-covers-stated-outcomes`, full plan sweep, SRS/index updates, `deno task check`.

## Follow-ups

- Review-atom fix: dismissal rigor ("saw the gap, approved anyway" — django-13195/16256) + independent expectation reconstruction (gold behavior absent from request text: django-11820, sphinx-7748, sympy-20428). Separate task.
- Pre-existing debt: Step-3 placeholder bullets vs Step-5a concrete-tuple walk dead-end when the request states no discrete outcomes (critic gate 2 round 2, ADVISORY 2).
