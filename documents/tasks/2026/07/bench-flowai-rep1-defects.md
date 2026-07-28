---
date: 2026-07-28
status: done
implements:
  - FR-BENCH-SWE
tags: [benchmark, flowai-arm, harness, codex]
related_tasks:
  - documents/tasks/2026/07/bench-flowai-arm-codex.md
---
# Harness defects the first flowai rep exposed

## Goal

The first flowai campaign measured the harness as much as it measured flowai.
Reading all fifteen session logs showed three defects that cost instances
outright, so the 3/15 result describes a stand that no longer exists. Fix them,
then re-measure.

## Overview

### Context

Findings from `scripts/benchmark/runs/pool2-flowai/rep1/`, 15 sessions:

- 4 of the 11 sessions with a surviving log were rejected at the plan gate
  because the plan skill halted on a missing `documents/design.md`. Verbatim
  (`pygeoapi-2338`): "Planning is blocked: the required SDS role resolves to
  `documents/design.md`, but that file does not exist."
- The rejection was still wrapped into the `$implement` turn, so the agent spent
  that turn re-planning and `$review` ran over an empty tree.
  `pygeoapi-2338`, `meltano-9929` and `virtualizarr-979` produced NO patch.
- 4 sessions (`pdm-3759`, `pennylane-9298`, `schemathesis-3778`, `nicegui-5914`)
  hit the 20-minute cap and left a 41-byte log holding only the timeout marker —
  no turns, no commands, a fifth of the run undiagnosable.
- `pdm-3759` shipped a 395 KB patch that was almost entirely `uv.lock`.
- `pygraphistry-1277` graded `solved-broke` (F2P 2/2, 6 P2P broken): every one of
  its 9 pytest invocations narrowed to the three tests it had chosen itself.
- Host under strain during the run: 15–25 % memory free, swap 87–95 % full,
  load 4.2–8.5 on 10 CPU; `schemathesis-3933` saw and killed other sessions'
  pytest processes.

### Current State

`renderDocStubs` wrote SRS + Index only. `runWithTimeout` returned the marker
alone because `AcpAgent.run()` hands its log back only on return.
`GateEmulatorOperator` wrapped EVERY emulator reply into `/implement`.
`maxSteps` was 3, hard-coded twice (session and cell header).

### Constraints

- Deno + TS, Code TDD, no new runtime deps.
- FR-BENCH-SWE.SYMMETRY requires equal `maxSteps` in both arms — a flowai-only
  bump would break it (user decision 2026-07-28: raise BOTH to 4).
- A cell header carries one harness shape, so the rep-1 flowai cell cannot hold
  reps from before and after this change (user decision: discard and re-measure).

## Definition of Done

- [x] FR-BENCH-SWE: every doc role the rendered `AGENTS.md` resolves gets a stub
      on disk, so the plan skill never halts on a missing role
  - Test: `scripts/benchmark/agents_md_test.ts::renderDocStubs: writes a stub for EVERY doc role AGENTS.md resolves`
  - Evidence: `deno test -A scripts/benchmark/agents_md_test.ts`
- [x] FR-BENCH-SWE: a timed-out session keeps its transcript, marker last
  - Test: `scripts/benchmark/run_test.ts::timeoutLog: the partial transcript survives the timeout, marker last`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: a rejected plan costs its own turn, not the
      implementation turn; the decision is machine-readable and never guessed
  - Test: `scripts/benchmark/human_emulator_test.ts::GateEmulatorOperator: a rejected plan buys a re-plan turn, not a lost implement turn`
  - Test: `scripts/benchmark/human_emulator_test.ts::parseGateVerdict: separates the decision from the message it carries`
  - Evidence: `deno test -A scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the turn budget is one constant, equal in both arms,
      shared by the session and the cell header
  - Evidence: `grep -n "SESSION_MAX_STEPS" scripts/benchmark/run.ts scripts/benchmark.ts` — defined once, imported once
- [x] FR-BENCH-SWE.CELLS: the rep-1 flowai cell is gone, since the harness it
      measured no longer exists
  - Evidence: `deno run -A scripts/benchmark.ts cells-show` lists three baseline cells and no flowai cell
- [x] Docs match the code (SRS FR-BENCH-SWE.SYMMETRY + .POOL2, SDS §3.22)
  - Evidence: `deno task check` — exit 0
- [x] `deno task check` green
  - Evidence: `deno task check` — exit 0, 0 failed (2026-07-28)

## Solution

1. `agents_md.ts`: `renderDocStubs` returns `{requirements, design, index}`;
   `installDocStubs` writes all three. The test asserts the CORRESPONDENCE — each
   role path present in the rendered `AGENTS.md` has a non-empty stub — so a
   fourth role added later fails the test instead of shipping silently.
2. `run.ts`: `timeoutLog(partial, message)` + `AcpAgent.getPartialLog()`.
3. `human_emulator.ts`: `DECISION: AUTHORIZE|REPLAN` in the gate prompt,
   `parseGateVerdict` splitting decision from message (loud failure on an absent
   or unknown token), `GateEmulatorOperator` spending one re-plan turn via
   `operator.ts` `replanTurn`.
4. `run.ts`: `SESSION_MAX_STEPS = 4`, imported by `benchmark.ts` for the cell
   header. `cells_import.ts` keeps the literal 3 — that is the shape the imported
   campaigns actually ran under.
5. Delete `scripts/benchmark/cells/codex-flowai-44d8965a5ce4-gpt-5-6-terra-medium/`.

## Not done here

- **Narrow verification in `review`** (`pygraphistry-1277`). This is skill
  behaviour, not harness behaviour, so it belongs to Acceptance-Test TDD on the
  `review` skill rather than to `scripts/`.
- **Host contention between concurrent sessions.** The `review` skill runs a full
  suite plus a parent-baseline run in a temp worktree; several of those at once
  on a machine already at 90 % swap is the likely cause of the four timeouts.
  Needs a decision on concurrency or on isolating test runs, not a code fix.
