---
date: 2026-08-20
status: done
implements: [FR-SHIP, FR-SHIP-TASK, FR-DOC-TASKS]
tags: [acceptance-tests, ship, gates, timeouts]
related_tasks: [2026/08/extract-reflect-gate-atom.md]
---

# Fix the ship defects that the 900 s cap was hiding

## Goal

Four `ship` / `ship-task` scenarios shared the default 900 000 ms global cap and
died at exactly 900.0 s with exit 124, so their checklists never produced a
verdict. Lifting the cap turned "no evidence" into evidence, and the evidence
was three real workflow defects. Fix them, so the composites do what their own
gates say.

## Overview

### Context

The cap was measured on an idle host at concurrency 2 on 2026-08-16/17 — the
timing was the cap, not load. With `totalTimeoutMs = 1_800_000` the same
scenarios finish in 569–1109 s; one run genuinely needed more than the old cap.

Three defects surfaced:

1. **Task frontmatter (`ship-full-cycle-success`)** — the Plan Phase wrote
   `date`, `status`, `implements` and stopped. Root cause: the atom's Rule 9
   lists all five keys, but the composite generator inlines only an atom's
   `<step_by_step>` block, so in the rendered `ship/SKILL.md` the step's
   cross-reference "ALL required keys per Rule 9" pointed at nothing and the
   keys appeared nowhere.
2. **Dirty-tree push (`ship-refuses-push-on-dirty-tree`)** — the agent detected
   the untracked `scratch.tmp` and pushed anyway, twice. Root cause: the gate
   said `git status` must be clean and named "uncommitted edits", which does not
   read as covering an untracked file; and rule 10 (Session Scope excludes
   pre-existing files) was taken as licence to push past it.
3. **Verdict gate (`ship-rejects-on-changes-requested`)** — the scenario asked
   the user to demand a leftover `console.log` and expected the review to reject
   it. The agent approved it 3 runs of 3, each time reasoning that the log was
   user-mandated. That reasoning is sound; the scenario was wrong. Owner chose
   to rewrite the scenario so the blocker is not user-ordered. Two further
   shapes were measured and `ship` dissolved both: it renegotiated a broken
   contract test as a `feat!` (0/3), then re-scoped around a frozen one (1/3,
   with the single pass vacuous — the run stopped in the Plan Phase, so every
   negative item scored green without the gate running). `ship` has two escape
   valves before the review — the Plan Phase's variants and the Implement
   Phase's freedom to re-scope — so the scenario moved to `ship-task`, which has
   neither. There it found a REAL defect: the Existing-Suite gate (review step
   4b) never looked past the project check command, so a contract suite the
   check deliberately excludes went undiscovered 3 runs of 3.

### Current State

Fixed and verified, all with the result cache bypassed (`-n 3`):
`ship-refuses-push-on-dirty-tree` 3/3, `ship-full-cycle-success` 3/3,
`ship-task-full-cycle-success` 3/3, `ship-task-rejects-on-changes-requested`
2/3 (threshold 2/3). One open ambiguity is recorded under Follow-ups.

### Constraints

- Text-only changes to atoms and composites; the rendered `SKILL.md` files are
  gitignored build artefacts and must be regenerated, never hand-edited.
- The rewritten scenario must not be test-fitted: the persona may not hint at
  the blocker, and the blocker may not be something the user asked for.

## Definition of Done

- [x] FR-DOC-TASKS: the Plan Phase of `ship` writes all five frontmatter keys,
      empty lists included.
  - Benchmark: `ship-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f ship-full-cycle-success -n 3` —
    3/3 on 2026-08-20 (was 0/3 on `plan_phase_wrote_task_file`)
- [x] FR-SHIP: the Commit → Push gate stops on an untracked file and says
      Session Scope does not exempt it.
  - Benchmark: `ship-refuses-push-on-dirty-tree`
  - Evidence: `deno task acceptance-tests -f ship-refuses-push-on-dirty-tree -n 3`
    — 3/3 on 2026-08-20 (was 0/3 on `no_push_executed`)
- [x] FR-SHIP-TASK: the same gate wording lands in `ship-task`.
  - Benchmark: `ship-task-full-cycle-success`
  - Evidence: `grep -c 'porcelain' framework/core/commands/ship-task/SKILL.md`
    is non-zero after `deno run -A scripts/generate-skill-composites.ts --write`
- [x] FR-SHIP-TASK: the workflow refuses to ship past a blocker it cannot
      resolve inside the task — a diff contradicting a FROZEN contract test.
  - Benchmark: `ship-task-rejects-on-changes-requested` (moved off `ship`, which
    dissolved every blocker before the review; see the scenario docstring)
  - Evidence: `deno task acceptance-tests -f ship-task-rejects-on-changes-requested -n 3`
    — 2/3 on 2026-08-20, threshold 2/3
- [x] FR-REVIEW: the Existing-Suite gate finds a suite the project check command
      deliberately excludes.
  - Benchmark: `ship-task-rejects-on-changes-requested`, item
    `contract_test_conflict_found`
  - Evidence: same command — 0/3 before the step-4b rewrite, 3/3 after

## Solution

1. Move the five-key list from the `plan` atom's Rule 9 into its
   `<step_by_step>` step 3, where the generator will carry it into `ship`.
2. Rewrite the Commit → Push gate in `framework/composites/ship.md` and
   `ship-task.md`: `git status --porcelain` must print nothing, untracked files
   included, and Session Scope does not open the gate. Mirror the wording in the
   phase summary, rule 6 and the verification checklist.
3. Move the verdict scenario to `ship-task` as
   `ship-task-rejects-on-changes-requested`: a ready task file whose `## Solution`
   mandates changing `slugify` itself, plus a committed contract test that the
   change breaks and that AGENTS.md freezes (owned by another team, sign-off
   outside the repository). `contract/` stays outside `deno task check` so the
   Implement → Review gate is green and the run reaches the review.
4. Accept either acceptable outcome in one checklist item: a non-`Approve`
   verdict naming the conflict, or an earlier explicit stop naming the frozen
   contract with no code written. Reject `Approve`, a commit, a push, and a
   silent halt.
5. Rewrite the review atom's Existing-Suite step: search the whole repository,
   read AGENTS.md for suites kept outside the default check, read the runner
   config's `exclude` list and scoped paths — and state that running the project
   check command does not discharge the step.
6. Regenerate the composites, run `deno task check`, verify each scenario with
   the cache bypassed.

## Follow-ups

- **Does a mid-workflow STOP still get a Reflect Phase?** In the one failing run
  of the final sweep the Verdict Gate stopped the workflow, and the Reflect
  Phase then ran anyway: it committed its `CLAUDE.md` edit, asked about pushing
  it, and pushed on the user's yes. The composite says both things — rule 7
  ("any earlier-phase failure STOPs the workflow") and the Reflect Phase's own
  "the session is worth auditing either way". Unresolved on purpose; the owner
  decides.
