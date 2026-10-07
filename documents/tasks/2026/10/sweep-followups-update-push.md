---
date: 2026-10-06
status: done
implements:
  - FR-UPDATE
  - FR-ATOM-PUSH.CI-AWAIT
  - FR-SHIP
  - FR-SHIP-TASK
related_tasks:
  - remove-user-only-commands
---
# Close the four failures left by the seven-skill acceptance sweep

## Goal

After the seven former user-only commands became skills
(`remove-user-only-commands`), the full acceptance sweep of those seven ended at
49 of 53. The user decided each of the four remaining failures on 2026-10-06
(answers 1A, 2, 3B, 4B). This task carries those decisions out, so the seven
skills are green on the default arm and the two product defects found on the
way are fixed in the product, not in the tests.

## Overview

### Context

- **1A — `ship-task-rejects-on-changes-requested`.** `gpt-6-luna` met the
  frozen contract test during the Implement Phase and stopped there, with the
  implementation written but uncommitted. The checklist's route (b) failed
  that, although the fixture's `AGENTS.md` makes every `src/` change run the
  contract tests, so stopping there is what the project rules ask for. The user
  chose to widen route (b): a stop before commit counts when it names the
  frozen test and the sign-off it needs.
- **Q2 — `ship-full-cycle-success`.** The query ended with "Touches FR-TRIM."
  The fixture has no SRS, so the review's FR Coverage Audit blocked the happy
  path on `no acceptance reference`. The user asked what the phrase was for; it
  was decoration in a happy-path test, and it is removed.
- **3B — `update-basic`, `update-template-vs-artifact`.** `gpt-6-luna`
  summarised the gap ("several planning rules are missing", a wholesale
  replacement of `AGENTS.md`) instead of naming the missing rules. Interviews of
  both failed runs: the instruction to list rules by name was there and was not
  followed; the agent of `update-basic` also refused the template because it
  had local modifications, reading "read-only" as "pristine". The user chose a
  bundled script that prints the inventory, so the agent cannot summarise it
  away.
- **4B — `push-investigates-ci-failure`.** The push atom's handoff claimed "the
  worktree is already clean (step 5 verified `@{u} == HEAD`)". That proves only
  that the commit reached the remote. With a dirty tree, `investigate`'s Clean
  Baseline rule refused the run. The scenario was fixed separately (commit
  `028455bf`, setup now commits its files); the product defect remains. The user
  chose to run the investigation in a temporary `git worktree` of the pushed
  SHA.

### Current State

- `framework/core/skills/update/SKILL.md` step 4 asks to list missing rules by
  name and mentions `Proactive Resolution` under Planning Rules, where the
  template no longer keeps it (it moved to Core Project Rules).
- `framework/atoms/push.md` step 6, Investigate Handoff, item 3 carries the
  false clean-tree claim; SDS §3.19 repeats it.
- `framework/core/skills/investigate/SKILL.md` rule 2 requires a clean worktree
  and offers no way to get one.

### Constraints

- Shipped scripts are Python stdlib only; nothing under
  `framework/<pack>/skills/<name>/` outside `acceptance-tests/` may spell this
  repo's documentation paths.
- Acceptance-test TDD: each changed skill has a scenario that was red on the old
  text.
- `documents/requirements.md`, `documents/design.md` and
  `framework/core/assets/AGENTS.template.md` carry other sessions' uncommitted
  edits; only this task's hunks are committed.

## Definition of Done

- [x] FR-SHIP-TASK: route (b) of `verdict_gate_or_explicit_stop` accepts a stop
  before commit that names the frozen test and the needed sign-off.
  - Benchmark: `ship-task-rejects-on-changes-requested`
  - Evidence: `deno task acceptance-tests -f ship-task-rejects-on-changes-requested --no-cache` → `PASSED`
- [x] FR-SHIP: the full-cycle query names no FR.
  - Benchmark: `ship-full-cycle-success`
  - Evidence: `! grep -n 'Touches FR-TRIM\.' framework/core/skills/ship/acceptance-tests/full-cycle-success/mod.ts | grep -v '//'` and `deno task acceptance-tests -f ship-full-cycle-success --no-cache` → `PASSED`
- [x] FR-UPDATE: `scripts/compare_rules.py` prints every missing named rule with
  its template section, and step 4 of `update` runs it.
  - Test: `framework/core/skills/update/scripts/compare_rules_test.ts`
  - Evidence: `deno test -A framework/core/skills/update/scripts/compare_rules_test.ts` → `5 passed` and `grep -c compare_rules.py framework/core/skills/update/SKILL.md` → ≥ 2
- [x] FR-UPDATE: both update scenarios pass on the default arm.
  - Benchmark: `update-basic`, `update-template-vs-artifact`
  - Evidence: `deno task acceptance-tests -f update-basic --no-cache` and `-f update-template-vs-artifact --no-cache` → `PASSED`
- [x] FR-ATOM-PUSH.CI-AWAIT: on red CI with a dirty tree, `investigate` runs in a
  temporary worktree of the pushed SHA and the developer's files stay intact.
  - Benchmark: `push-investigates-ci-failure-dirty-tree` (red on the old text)
  - Evidence: `deno task acceptance-tests -f push-investigates-ci-failure-dirty-tree --no-cache` → `PASSED`; `grep -c 'already clean' framework/atoms/push.md` → 0
- [x] FR-ATOM-PUSH.CI-AWAIT: the existing CI-failure scenario still passes.
  - Benchmark: `push-investigates-ci-failure`
  - Evidence: `deno task acceptance-tests -f push-investigates-ci-failure --no-cache` → `PASSED`
- [x] SRS FR-UPDATE and FR-ATOM-PUSH.CI-AWAIT, and SDS §3.19, describe the new
  behaviour and list the new scenario.
  - Evidence: `grep -c 'push-investigates-ci-failure-dirty-tree' documents/requirements.md documents/design.md` → 1 each; `grep -c compare_rules.py documents/requirements.md` → 1
- [x] The gate is green.
  - Evidence: `deno task check` → `0 failed`

## Solution

1. 1A: rewrite route (b) and the docstring of
   `ship-task/acceptance-tests/rejects-on-changes-requested/mod.ts`.
2. Q2: drop "Touches FR-TRIM." from the `ship-full-cycle-success` query, with a
   dated comment saying why.
3. 3B: add `update/scripts/compare_rules.py` (bold-label list items under
   headings of level 1–3, case- and punctuation-insensitive, a rule counts as
   present in any section, fenced blocks skipped) and its Deno test. Step 4 of
   `update` runs it and pastes the output; step 7 addresses every listed rule
   by name; rule 3 says a locally modified template is still the template.
   Point `proposed_adding_rule` of `update-template-vs-artifact` at the section
   where the template keeps the rule now.
4. 4B: write `push-investigates-ci-failure-dirty-tree` (CI red, one tracked
   edit and one untracked file left uncommitted), run it red on the old text.
   Then: the push atom's handoff drops the clean-tree claim and asks
   `investigate` to work in `git worktree add <scratch> $SHA`; `investigate`
   rule 2 and step 1 learn the worktree route for a dirty tree or a named
   commit, and remove the worktree at the end. Regenerate composites.
5. Update SRS/SDS, run `deno task check`, commit by explicit paths (index built
   from HEAD for the two shared documents), push, watch CI.
6. Hand off the full sweep of the affected primitives to the user.
