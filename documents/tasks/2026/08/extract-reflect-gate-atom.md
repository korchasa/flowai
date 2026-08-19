---
date: 2026-08-17
status: done
implements:
  - FR-REVIEW-COMMIT
  - FR-SKILL-COMPOSE
---
# Extract the reflect branch from `commit` into its own atom

## Goal

`ship` and `ship-task` lose their Push Phase. The `commit` atom carries the
session-complexity check, the approval gate and the reflect invocation as its
steps 6-8, and it has no `HAND_OFF_TO_NEXT` form — unlike `plan`, `implement`
and `push`, which all declare `TERMINATION`. Inlined third of four, it renders
in its terminal shape and the reflect sub-run ends the turn inside it, so the
Commit -> Push gate is never reached.

## Overview

### Context

Measured 2026-08-17 on `ship-task-full-cycle-success` (run-1 of the
09-27-52 sweep): the emulated operator answered the approval gate once
(`report only`), reflect produced its report, the agent stopped writing, and
the harness closed the session because no question was pending
(`acp_agent.ts:206` + `user_emulator.ts:46`). Commit `e15cc25` stayed local.

### Current State

- `framework/atoms/commit.md` steps 6 (complexity check + gate + invoke
  reflect), 7 (post-reflect cleanup commit), 8 (verify clean state); rule 9
  names all three as obligations outliving the commit.
- `framework/composites.yaml`: `commit` is phase 2/2 of `review-and-commit`,
  4/5 of `ship`, 3/4 of `ship-task`.
- Scenarios depending on the branch: `commit-auto-invoke-reflect`,
  `review-and-commit-auto-invoke-reflect`,
  `review-and-commit-post-reflect-cleanup-commit`.

### Constraints

- User decisions (2026-08-17): reflect lives only in composites; the standalone
  `commit` skill loses it and `commit-auto-invoke-reflect` is deleted. The new
  atom gets its own installed target. The new phase goes BEFORE Push.
- Composite wrappers MUST NOT declare `_params:` (generator rejects it) —
  parametrise at atom level.
- Every generated SKILL.md stays under `SKILL_MAX_LINES` (700).

## Definition of Done

- [x] FR-SKILL-COMPOSE: a `reflect-gate` atom exists with a `TERMINATION`
      param and renders both standalone and inlined.
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --check`
- [x] FR-REVIEW-COMMIT: `commit` no longer carries the reflect branch; the
      generated standalone `commit` SKILL.md has no reflect step.
  - Evidence: `! grep -qE 'Session Complexity|Auto-Invoke Reflect' framework/core/commands/commit/SKILL.md` (the word "reflected" survives in ordinary prose, so grep for the step, not the substring)
- [x] FR-ATOM-REFLECT-GATE: `ship` and `ship-task` reach the Push Phase and
      then run the reflect phase after it.
  - Test: `ship-task-reflect-after-push`
  - Evidence: `deno task acceptance-tests -f ship-task-reflect-after-push -n 3`
- [x] FR-REVIEW-COMMIT: `review-and-commit` keeps the reflect behaviour.
  - Test: `review-and-commit-post-reflect-cleanup-commit`
  - Evidence: `deno task acceptance-tests -f review-and-commit-post-reflect -n 3`
- [x] Baseline clean.
  - Evidence: `deno task check`

## Solution

1. New `framework/atoms/reflect-gate.md` — steps 6/7/8 of `commit.md` moved
   verbatim, renumbered 1/2/3, plus a `TERMINATION` param
   (`TOTAL_STOP` | `HAND_OFF_TO_NEXT`).
2. `framework/atoms/commit.md` — drop steps 6-8 and rule 9; keep a two-line
   clean-state check; update `<verification>`.
3. `framework/composites.yaml` — register the atom; insert the phase last in
   all three composites, i.e. AFTER the Push Phase in `ship` / `ship-task`, so
   the only work left after its commit question is that commit.
4. Wrappers — new phase titles, gates, overview/rules/verification lines.
5. Acceptance tests — delete `commit/acceptance-tests/auto-invoke-reflect`;
   add `ship-task/acceptance-tests/reflect-after-push` proving the push lands
   and the reflect phase runs after it, asks about the commit, and waits.
6. SRS/SDS — record the split and the new primitive.
