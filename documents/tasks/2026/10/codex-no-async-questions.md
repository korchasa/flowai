---
date: 2026-10-07
status: done
implements:
  - FR-ACCEPT.ACP
tags: [acceptance-tests, codex, user-emulator]
---
# The codex agent under test asks its questions in the reply

## Goal

An interactive acceptance scenario must reach the simulated user. On codex
0.159 with `gpt-6-luna` the agent asks through the `request_user_input_async`
tool, the answer never arrives, and the scenario is scored on a dialogue that
never happened.

## Overview

### Context

- The 2026-10-07 sweep (`acceptance-tests/runs/2026-10-07T19-43-48`) failed
  `write-prd-basic`: the agent called `request_user_input_async`, got
  `{"accepted":true}`, slept 30 s twice and wrote the PRD with the questions
  open. The simulated user never had a turn.
- Measured 2026-10-07 with a probe client that declared ACP form elicitation
  (`elicitation: { form: {} }`) to codex-acp 2.0.1: the agent called the same
  tool, no `elicitation/create` request reached the client, and the turn ended
  after 107 s of sleeping. The codex binary keeps the async question in its own
  thread state and expects the reply as an `AsyncQuestionReply` user input,
  which the bridge does not implement. Only the synchronous
  `request_user_input` goes through `item/tool/requestUserInput` and form
  elicitation.
- User decision 2026-10-07: for now, ask the agent not to use this tool. Making
  the runner answer the tool is deferred.

### Current State

- `agentLaunchEnv` (`scripts/acceptance-tests/lib/agent_env.ts`) gives the
  codex arm `CODEX_CONFIG` with `model` and `model_reasoning_effort` only.
- `codexAgentEnv` is shared with the SWE-rebench benchmark
  (`scripts/benchmark/run.ts`); its config must stay as it is so benchmark
  cells keep their conditions.
- `UserEmulator` answers between turns: it reads the agent's reply and speaks
  when the reply asks something.

### Constraints

- The instruction goes into codex `developer_instructions`, not into the user
  query: the judge reads the user query, and a harness sentence there would be
  scored as the user's words.
- The benchmark arm is not changed.

## Definition of Done

- [x] FR-ACCEPT.ACP: the codex agent under test is told, as a developer
  instruction, not to call `request_user_input_async` and to ask in its reply
  instead; the benchmark config is unchanged.
  - Test: `scripts/acceptance-tests/lib/agent_env_test.ts::agentLaunchEnv: a codex session forbids the async question tool` and `::codexAgentEnv: pins effort AND model into the bridge session config`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/agent_env_test.ts scripts/benchmark/run_test.ts`. Result: 19 passed, 0 failed.
- [x] FR-ACCEPT.ACP: on the default codex arm, `write-prd-basic` reaches the
  simulated user — no `request_user_input_async` call in the rollout, and at
  least one `[turn 2] >` line in the trace.
  - Test: `Benchmark: write-prd-basic`
  - Evidence: `deno task acceptance-tests -f write-prd-basic --no-cache`, then `jq -r 'select(.type=="response_item") | .payload | select(.type=="function_call") | .name' <rollout> | grep -c request_user_input_async` prints 0 and `grep -c '^\[turn 2\] >' <judge-evidence.md>` is at least 1. Result: `-n 3` run `acceptance-tests/runs/2026-10-07T20-47-11` — 0 async calls and one `[turn 2] >` reply in each of the 3 runs; the instruction text is in the rollout. A single earlier run (`2026-10-07T20-44-56`) also made 0 async calls but asked nothing, so the simulated user had no turn. All 4 runs still fail `specific_not_vague` (the judge finds unmeasured latency and reliability targets in the PRD); that is a defect of the PRD content, outside this task.
- [x] Gate green.
  - Evidence: `deno task check` ends with `0 failed` in every summary line. Result: 870 and 193 passed, 0 failed.

## Solution

1. RED: change the codex `agentLaunchEnv` test to expect a
   `developer_instructions` key naming `request_user_input_async`; keep the
   `codexAgentEnv` test asserting the bare two-key config.
2. GREEN: `codexAgentEnv` takes optional extra config keys; `agentLaunchEnv`
   passes `developer_instructions` with the instruction text.
3. SRS FR-ACCEPT.ACP: an acceptance line for the instruction and its reason.
   SDS §3.4 per-arm entry: the codex config now carries the instruction.
4. Run `write-prd-basic` on the default arm and read the rollout and the trace.
5. `deno task check`, commit by path, push.
