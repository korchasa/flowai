---
date: 2026-07-28
status: done
implements:
  - FR-BENCH-SWE.SYMMETRY
tags: [benchmark, flowai-arm, human-emulator]
related_tasks:
  - documents/tasks/2026/07/bench-flowai-rep1-defects.md
---
# The flowai arm's operator speaks on every turn, and never judges the work

## Goal

The flowai arm consulted the human emulator ONCE, at the planning gate, and then
replayed two canned strings. So the arms differed not only by flowai but by
whether anyone was listening — and the difference cost flowai instances.

## Overview

### Context

Rep 1 on the fixed harness (see the related task) left two sessions with no
patch at all, both blocked on the sandbox environment: `smolvm-172` ("Cargo has
no configured Rust toolchain") and `virtualizarr-979` ("cannot collect tests due
to missing `h5py`"). Both did exactly what the seeded `AGENTS.template.md:273`
tells them to do — "root cause outside your control → STOP immediately and ask
the user" — and asked into a void, because the flowai operator had nothing left
to say after turn 2. The bare arm has a live human after every turn and simply
wrote code.

The canned turns also contradicted the seeded rule outright: they ended with
"Proceed without further questions" while the AGENTS.md said stop and ask.

### Current State

`GateEmulatorOperator` called the emulator once, wrapped the reply into
`/implement`, then replayed a constant `reviewTurn()` and returned null.
`reviewTurn` took no feedback. The gate prompt knew two decisions.

### Constraints

- Deno + TS, Code TDD, no new runtime deps.
- Measurement honesty: the emulator still sees only the issue text and the
  engineer's message — never gold patches or FAIL_TO_PASS.
- No fallbacks: an unparsable or blank reply fails the instance loudly.

## Definition of Done

- [x] FR-BENCH-SWE.SYMMETRY: every flowai turn after `/plan` is authored by the
      emulator; no canned follow-up strings remain
  - Test: `scripts/benchmark/human_emulator_test.ts::FlowaiOperator: a rejected plan buys a re-plan turn, not a lost implement turn`
  - Evidence: `deno test -A scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the decision vocabulary covers all five moves and is
      never guessed
  - Test: `scripts/benchmark/human_emulator_test.ts::parseOperatorDecision: separates the decision from the message it carries`
  - Test: `scripts/benchmark/human_emulator_test.ts::FlowaiOperator: an ANSWER is a plain turn, a DONE ends the session`
  - Evidence: `deno test -A scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the human does not assess the work — it hands the
      review task over, and the session ends on the engineer's answer without
      another emulator call
  - Test: `scripts/benchmark/human_emulator_test.ts::FlowaiOperator: the session ends on the answer to the review turn, emulator not consulted again`
  - Test: `scripts/benchmark/human_emulator_test.ts::operatorMessages: carries the issue and the plan output, no gold fields`
  - Evidence: `deno test -A scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: `/review` carries the human's words and no
      "proceed without further questions" line
  - Test: `scripts/benchmark/operator_test.ts::follow-up turns: separate commands, each carrying the human's words`
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts`
- [x] Docs match the code (SRS FR-BENCH-SWE + .SYMMETRY, SDS §3.22)
  - Evidence: `deno task check` — exit 0
- [x] `deno task check` green
  - Evidence: `deno task check` — exit 0, 0 failed (2026-07-28)

## Solution

1. `human_emulator.ts`: `gateMessages` → `operatorMessages` with a system prompt
   that opens by telling the human they do NOT check the engineer's work, lists
   four duties (coverage, authorization, no-work claims, blockers) and defines
   five decisions. `parseGateVerdict` → `parseOperatorDecision` over the five
   words. `GateEmulatorOperator` → `FlowaiOperator`, dispatching on the decision
   and short-circuiting to `null` once the review task was handed over.
2. `operator.ts`: `reviewTurn(feedback, prefix)` — the human's own words, no
   canned no-questions line.
3. `run.ts`: wire `FlowaiOperator` + `makeCliOperatorEmulator`.

## Not done here

- Installing project dependencies in the sandbox from the dataset's
  `install_config`. The operator can now TELL a blocked engineer to install what
  they need, which is the cheaper half of the fix; whether the harness should
  pre-install remains the open decision from the related task.
