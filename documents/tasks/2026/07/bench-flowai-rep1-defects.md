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

> **Path retired 2026-08-08:** `runs/pool2-flowai/` was deleted with the rest of
> the pre-cell run layout (commit `318fed26`), and this arm produced no result
> cell — Claude/Sonnet as the subject IDE was itself retired (see
> `documents/benchmarks/retired-approaches.md`, approach 8). The session logs are
> gone with no substitute; the findings distilled below ARE the surviving record
> of that campaign. Nothing here can be re-derived from data, so do not treat the
> path as fetchable.

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
  - Test: `scripts/benchmark/human_emulator_test.ts::FlowaiOperator: a rejected plan buys a re-plan turn, not a lost implement turn`
  - Test: `scripts/benchmark/human_emulator_test.ts::parseOperatorDecision: separates the decision from the message it carries`
  - Note: the operator was renamed `GateEmulatorOperator` → `FlowaiOperator` by the follow-up task `bench-operator-every-turn.md`; the test names above are the current ones.
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

## Result — rep 1 re-measured on the fixed harness, 2026-07-28

flowai **4/15** vs baseline 8 solves across 3 reps (2.67/15 per rep). ONE rep,
so this is still noise-level, not an effect. 1 h 48 min, concurrency 2, zero
health aborts, zero backoff waits.

Every fix is confirmed live:

- No session halted on a doc role. All 15 reached substantive work; two of the
  three instances that produced NOTHING last time now carry patches
  (`pygeoapi-2338` 7 KB, `meltano-9929` 8 KB).
- Three sessions hit the 20-minute cap (`pygraphistry-1277`,
  `schemathesis-3778`, `schemathesis-3933`) and all three kept their full
  transcript — 14, 17 and 26 KB where the old harness wrote 41 bytes.
- `schemathesis-3933` used FOUR turns: the gate rejected its plan, spent a turn
  on the re-plan, and the session still produced an 8.9 KB patch. On the old
  harness that instance would have ended empty.
- No patch carries an IDE config dir, a lock file or `documents/`.

Per-instance, flowai vs baseline-over-3-reps:

- `anyio-1134` — baseline 0/3, flowai SOLVED. The only true baseline-fail →
  flowai-pass cell of the run.
- `pygeoapi-2338`, `sqlglot-7457`, `nicegui-5914` — baseline 1/3, flowai solved
  (inside the unstable band, not evidence on their own).
- `pygraphistry-1277` — `solved-broke` again: F2P 2/2, 622 P2P pass, 6 P2P fail,
  all in `test_lowering.py`, the file the agent edited. Unlike the discarded rep
  this session DID run the whole suite ("3,827 passed, 701 skipped"), so the
  earlier "verifies too narrowly" reading does not hold here. The likelier
  mechanism: the agent adjusted existing tests to its new behavior, grading
  strips test-file hunks, and the original assertions then fail. The P2P
  decomposition is what makes this visible at all.
- `smolvm-172`, `virtualizarr-979` — no patch, both blocked on the SANDBOX
  ENVIRONMENT, not on process: "Cargo has no configured Rust toolchain" and
  "cannot collect tests due to missing `h5py`". `smolvm-172` produced a 24 KB
  patch on the old harness, so for that instance this is a regression.

## Open problem the re-measurement exposed

The sandbox is a bare clone on the host; project dependencies are never
installed (grading has proper Docker images, the agent does not). The flowai arm
holds a RED → GREEN → REFACTOR discipline that requires running the suite, so
where the suite cannot run the discipline turns into refusing to work — while
the bare arm simply writes code. That asymmetry charges flowai for the harness's
environment gap. Needs a decision: install project deps in the sandbox, or let
the arm proceed without a runnable suite.

## Not done here

- **Narrow verification in `review`** (`pygraphistry-1277`). This is skill
  behaviour, not harness behaviour, so it belongs to Acceptance-Test TDD on the
  `review` skill rather than to `scripts/`.
- **Host contention between concurrent sessions.** The `review` skill runs a full
  suite plus a parent-baseline run in a temp worktree; several of those at once
  on a machine already at 90 % swap is the likely cause of the four timeouts.
  Needs a decision on concurrency or on isolating test runs, not a code fix.
