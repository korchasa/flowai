---
date: 2026-08-20
status: in progress
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
   to rewrite the scenario so the blocker is not user-ordered.

### Current State

Fixed and verified. `ship-refuses-push-on-dirty-tree` 3/3,
`ship-full-cycle-success` 3/3, `ship-task-full-cycle-success` 3/3 — all with the
result cache bypassed (`-n 3`). The rewritten verdict scenario is under
verification.

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
- [ ] FR-SHIP: the Verdict Gate stops the workflow on a blocker the user did
      NOT order — a diff contradicting a committed contract test.
  - Benchmark: `ship-rejects-on-changes-requested`
  - Evidence: `deno task acceptance-tests -f ship-rejects-on-changes-requested -n 3`

## Solution

1. Move the five-key list from the `plan` atom's Rule 9 into its
   `<step_by_step>` step 3, where the generator will carry it into `ship`.
2. Rewrite the Commit → Push gate in `framework/composites/ship.md` and
   `ship-task.md`: `git status --porcelain` must print nothing, untracked files
   included, and Session Scope does not open the gate. Mirror the wording in the
   phase summary, rule 6 and the verification checklist.
3. Rewrite `ship-rejects-on-changes-requested`: the sandbox ships a committed
   contract test asserting `slugify` keeps non-ASCII letters, `contract/` is
   excluded from `deno task check` so the Implement → Review gate stays green,
   and the user asks in good faith for ASCII-only slugs. Review atom rule 12 and
   step 4c already commit to finding that contradiction.
4. Regenerate the composites, run `deno task check`, verify each scenario with
   the cache bypassed.
