---
date: "2026-08-29"
status: done
implements:
  - FR-ACCEPT
  - FR-HOWTO
---

# Reds from the full sweep of 2026-08-28

## Goal

Clear the red scenarios the full sweep left behind, so the suite states the
truth about the framework rather than about the harness that measures it.

## Overview

### Context

Run: `acceptance-tests/runs/2026-08-28T23-50-08` — 311 scenarios, `-p 3`,
5 h 23 m wall, 18 red. The previous full sweep (`2026-08-24T18-45-43`) had 318
scenarios and 19 red.

### Current State

Eight of the eighteen were not defects. All eight are `plan-*`, all ran 0.0 s
with no tool calls: `system_health` refused the spawn because planning
dispatches subagents, so `-p 3` put nine CLI processes in flight and load
reached 8.29 per CPU against a threshold of 4. Re-measured at `-p 2`, all 26
`plan-*` scenarios are green with zero aborts
(`acceptance-tests/runs/2026-08-29T05-19-xx`).

One belongs to another session's uncommitted work
(`diagnose-benchmark-failure-raw-session`) and is left alone.

The rest split by layer:

- **Product** — `write-gods-tasks-basic`, `reflect-context`,
  `engineer-command-create`.
- **Instrument** — `maintenance-tooling-relevance`.
- **Contract / fixture** — `save-update`, `ship-refuses-push-on-dirty-tree`,
  `update-asset-drift-no-sync`.
- **Open** — `draw-mermaid-diagrams-trigger-pos-1` at 1/3, and
  `init-brownfield` at 2/3 twice in a row.

### Constraints

- Framework `SKILL.md` files listed in `composites.yaml` are gitignored build
  artefacts — edit the atom instead.
- `plan-*` scenarios overload the host at `-p 3`. Measure them at `-p 2`.

## Definition of Done

- [x] FR-HOWTO: a task file written by `write-gods-tasks` always carries a
  Solution, and its Goal names the outcome rather than the mechanism
  - Test: `Benchmark: write-gods-tasks-basic`
  - Evidence: run `2026-08-29T05-49-37`, 3/3; siblings green in the trigger run
- [x] FR-ACCEPT: the judge never loses a whole conversational turn to
  truncation
  - Test: `scripts/acceptance-tests/lib/evidence_test.ts::truncateTrace keeps every turn when the trace overflows`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/evidence_test.ts`;
    `Benchmark: maintenance-tooling-relevance` 3/3 in run
    `2026-08-29T09-23-07`, judge evidence now carries 10 turns per run instead
    of 5
- [x] FR-ACCEPT: the memex save fixture states the link format the skill
  actually uses
  - Test: `Benchmark: save-update`
  - Evidence: run `2026-08-29T09-16-04`, 3/3
- [x] FR-ACCEPT: the ship push gate is scored against a session where the user
  never lifts the blocker, and the gate holds when the user declines to act
  - Test: `Benchmark: ship-refuses-push-on-dirty-tree`
  - Evidence: run `2026-08-29T10-52-02`, 3/3. The contract fix alone reached
    2/3; the interviewed agent named "let the user decide" as the clause it
    read as an authorisation override, so the composite was amended too. Its
    six siblings in the same run: `ship-full-cycle-success`,
    `ship-pauses-for-variant-selection`, `ship-task-reflect-push-declined`,
    `ship-task-rejects-on-changes-requested` all 3/3;
    `ship-task-full-cycle-success` and `ship-task-reflect-after-push` aborted
    on host load and re-measured 3/3 each at `-p 1`
    (`2026-08-30T10-27-10`, `2026-08-30T10-42-58`)
- [x] FR-ACCEPT: the update drift fixture plants exactly one missing rule
  - Test: `Benchmark: update-asset-drift-no-sync`
  - Evidence: run `2026-08-29T10-32-20`, 3/3
- [x] FR-HOWTO: a reflect finding's draft is the artefact, not a suggestion
  - Test: `Benchmark: reflect-context`
  - Evidence: run `2026-08-29T10-36-57`, 3/3
- [x] FR-HOWTO: command authoring does not skip the examples step on a feature
  spec
  - Test: `Benchmark: engineer-command-create`
  - Evidence: run `2026-08-29T10-43-47`, 3/3

## Solution

1. Product: `framework/core/skills/write-gods-tasks/SKILL.md` (Solution
   placeholder, example 4's Goal), `framework/core/skills/reflect/SKILL.md`
   (draft content must be the artefact), and
   `framework/devtools/skills/engineer-command/SKILL.md` (what licenses skipping
   the concrete-examples step).
2. Instrument: `truncateTrace` in `scripts/acceptance-tests/lib/evidence.ts`,
   wired into `runner.ts`, budgeting the judge's context per turn instead of
   cutting the middle out of the conversation.
3. Contract: the memex `save/update` fixture migrated to SALP; the `ship`
   persona and its `no_push_executed` item made consistent; the `update` drift
   fixture derived from the rendered template.
3a. Product, found under the `ship` contract fix: the Commit -> Push gate in
   `framework/composites/ship.md` says what the user's decision covers -- the
   fate of the blocking files -- and states that no answer of theirs opens the
   gate.
4. Measure each at `-n 3`, plus a green sibling of every primitive edited.
