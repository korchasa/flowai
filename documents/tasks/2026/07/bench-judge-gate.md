---
date: "2026-07-04"
status: done
implements: [FR-BENCH-SWE]
tags: [benchmark, harness, gate, judge]
related_tasks: []
---
# Honest LLM-judged human gate in the SWE-bench flowai arm (H2)

## Goal

Make the benchmark's emulated human gate honest: the operator turn that authorizes
implementation after `/plan` becomes an LLM judge that reads the issue and the plan
output and replies as a knowledgeable human reviewer — instead of the unconditional
"Go ahead with your recommended variant" rubber stamp. Without this, no plan-phase
primitive improvement is measurable (loop4 STOP-ANALYSIS: every mechanism died on
"the oracle is rubber-stamped on the only measurement channel").

## Overview

### Context

- Loop4 decision log (`scripts/benchmark/runs/2026-07-04-loop4/_decision-log.md`):
  two plan-atom fix designs (V-A, V-B) rejected by critics; shared root: the bench
  operator (`scripts/benchmark/operator.ts` `implementTurn()`) auto-approves any
  recommendation, so plan-quality effects are invisible. H2 = fix the measuring
  device (precedent: test-hunk stripping, commit a3ef4161).
- The judge must see ONLY the problem statement + the plan-phase transcript output —
  never gold patches or FAIL_TO_PASS lists — to keep the measurement honest.
- User selected direction A (H2 first, then H1 independent-extraction subagent in
  the plan atom) in chat on 2026-07-04.

### Current State

`ScriptedOperator` replays fixed turns `[implementTurn(), reviewTurn()]` ignoring
conversation content. `AcpAgent.run(userEmulator)` passes the full transcript to
`getResponse(messages)`; the last assistant message is the plan output.
`cliChatCompletion` (`scripts/acceptance-tests/lib/llm.ts`) provides LLM calls via
`claude -p` with existing CLI auth.

### Constraints

- Judge sees issue + plan output only (no gold leakage).
- Fail fast: a judge call failure fails the instance loudly (existing runBenchmark
  per-instance catch produces an empty prediction and logs FAILED); no silent
  fallback to the rubber stamp.
- The gate becomes stochastic — document in run.ts header and the next report.
- No mocks of internal code in tests; the judge function is an external-service
  boundary and is injected.

## Definition of Done

- [x] FR-BENCH-SWE: judge-gate message builder includes the issue and plan output,
      instructs reviewer behavior (check outcome coverage, authorize one variant,
      challenge evidence-free no-work conclusions), and contains no gold data fields.
  - Test: `scripts/benchmark/gate_test.ts::judgeGateMessages`
  - Evidence: `deno test -A scripts/benchmark/gate_test.ts`
- [x] FR-BENCH-SWE: `JudgeGateOperator` passes the LAST assistant message to the
      judge, wraps the verdict into a `/implement` turn (keeping the no-commit
      framing), then yields the review turn, then null; judge failure or blank
      verdict rejects (fail fast).
  - Test: `scripts/benchmark/gate_test.ts::JudgeGateOperator`
  - Evidence: `deno test -A scripts/benchmark/gate_test.ts`
- [x] FR-BENCH-SWE: flowai arm wiring uses the judge gate; baseline arm unchanged.
  - Test: `scripts/benchmark/gate_test.ts` + existing `operator_test.ts` green
  - Evidence: `deno task check`
- [x] SRS FR-BENCH-SWE section documents the judged gate (and its stochasticity).
  - Test: manual — user
  - Evidence: `grep -n "judge" documents/requirements.md`

## Solution

1. New `scripts/benchmark/gate.ts`:
   - `judgeGateMessages(problemStatement, planOutput): LLMMessage[]` — pure builder;
     system prompt = human reviewer at the gate (outcome-coverage check, single
     variant authorization, no code, no solving).
   - `implementTurnWithVerdict(verdict): string` — `/implement` turn embedding the
     judge's reply plus the TDD/no-commit framing.
   - `JudgeGateOperator` — first `getResponse` call: judge(last assistant msg) →
     implement turn; second: `reviewTurn()`; then null. Judge injected as
     `(problemStatement, planOutput) => Promise<string>`.
   - `makeCliGateJudge(model)` — production judge over `cliChatCompletion`.
2. `scripts/benchmark/run.ts`: flowai arm constructs `JudgeGateOperator` (judge
   model = `opts.model`); `runWithTimeout` accepts the operator interface.
3. Update run.ts header limitation note + SRS FR-BENCH-SWE.

## Follow-ups

- H1: independent-extraction subagent in the plan atom (separate task; enters the
  improve-primitive loop's Phase 4/5 gates with its own critic rounds).
- Re-run the flowai arm after H2 to observe gate behavior on the stable-fail
  anchors (mechanism observation, not aggregate-count judgment).
- **Bench contamination finding (2026-07-04, empirical)**: ancestor-directory
  memory files (`CLAUDE.md`/`AGENTS.md` up the cwd path, e.g. `~/AGENTS.md`)
  load REGARDLESS of the isolated `HOME`. The judge is protected (temp cwd
  outside the developer's home), but the bench AGENT's sandbox cwd lives under
  the repo → under the developer's home → every prior run may have inherited
  the developer's personal `~/AGENTS.md` and `~/www/CLAUDE.md` rules. Assess
  impact and consider moving run sandboxes to a temp location outside `$HOME`.
  **Resolved** (2026-07-04): confirmed live in the judgegate run (agent narrated
  in Russian in-sandbox); fixed by
  [bench-sandbox-isolation](bench-sandbox-isolation.md) —
  `scripts/benchmark/sandbox_root.ts`.
