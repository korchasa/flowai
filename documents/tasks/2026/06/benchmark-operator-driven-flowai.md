---
date: 2026-06-28
implements: [FR-BENCH-SWE]
status: done
tags: [benchmark, swe-bench, flowai-arm, operator]
---
# Operator-driven flowai arm (separate plan/implement/review)

## Goal

Make the flowai benchmark arm actually exercise the flowai workflow. Today the
arm sends ONE prompt that merely *describes* plan→implement→review; transcripts
prove the agent invokes NO skill (0 `Skill` tool calls across 11 sessions). The
workflow must be driven by an operator across turns, invoking the plan, then
implement, then review skills as separate commands.

## Overview

### Current State (evidence)

- `run.ts` builds the flowai arm with `maxSteps: 1` + a single prompt listing the
  3 steps in prose. No operator. `AcpAgent.run(userEmulator?)` supports multi-turn
  (`acp_agent.ts:180` loop; next turn from `userEmulator.getResponse(messages)`),
  but the benchmark never passes one.
- Transcripts (`bench-home/.claude/projects/.../*.jsonl`): tool histogram is
  Bash/Read/Grep/Edit/TodoWrite/Task — zero `Skill`/`SlashCommand`.

### Root cause of 0 skill activations (mechanism)

- The tool list is NOT the blocker. claude-code-acp does NOT disallow `Skill` in
  the normal path (`disallowedTools` = `AskUserQuestion` + only the built-ins it
  replaces with ACP proxies). `allowedTools` is the SDK's AUTO-APPROVE list, not
  an exclusive allowlist — unlisted tools still pass via `canUseTool`. A client
  CAN also inject SDK options via `_meta.claudeCode.options` (spread into
  `query()` options).
- Skills are slash-invocable: `.claude/skills/` load into the SDK command
  registry (`md7(..., {isSkillMode:true})`), and the slash parser resolves
  `/plan` against them (`iQ4`/`cQ4` in `@anthropic-ai/claude-agent-sdk@0.2.44`).
- The bug was the turn FORMAT. `cQ4` takes the command name as
  `text.slice(1).split(" ")[0]` (split on SPACE only) and validates it via `byY`
  (`[A-Za-z0-9:_-]+`). Our turn `/plan\n\n<task>` made the name `"plan\n\nYou"`
  (everything up to the first space) → fails `byY` → slash NOT resolved → whole
  turn reaches the model as plain text → skill never fires.
- Fix: `slashTurn(name, args)` emits `/<name> <args>` with a SPACE right after the
  name (newlines allowed only inside args). Guarded by `operator_test.ts`
  ("clean name token + space separator").

### Decisions (user)

- REPLACE the flowai arm with operator-driven (single-prompt arm retired).
- Operator invokes plan/implement/review as separate skills (2A).
- First turn is just `/plan` + the task description — NOT the full sequence.
- Log ALL messages (agent + operator) — already captured by `AcpAgent` per-turn
  logging into `result.logs`, written to `<instance>.log`.

### Constraints

- Deterministic operator (no LLM) for reproducibility: a scripted turn list.
- `--step-timeout` wraps the WHOLE run (all turns); a 3-turn arm needs a larger
  budget than the 1-turn arm — surface this to the operator.

## Definition of Done

- [x] FR-BENCH-SWE: `ScriptedOperator.getResponse` yields a fixed turn sequence
      then null, ignoring conversation content.
  - Test: `scripts/benchmark/operator_test.ts`
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts` → 6 passed
- [x] FR-BENCH-SWE: flowai turn 1 is `/plan` + issue only (no implement/review
      prose); follow-up turns are `/implement` then `/review`.
  - Test: `scripts/benchmark/operator_test.ts` (planTurn/implementTurn/reviewTurn)
  - Evidence: same
- [x] FR-BENCH-SWE: flowai turns are well-formed slash commands (`/<name> <args>`,
      space after name) so the SDK resolves them to the project skills.
  - Test: `scripts/benchmark/operator_test.ts` ("clean name token + space separator")
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts` → 6 passed
- [x] FR-BENCH-SWE: flowai arm drives 3 operator turns and a smoke instance shows
      the plan/implement/review skill bodies expand (slash-resolved), not literal
      `/plan` text passed through.
  - Evidence: smoke `django__django-14792` (runs/smoke-ops2): transcript expanded
    `/plan`→`/implement`→`/review` (3 `<command-name>` blocks, 0 literal slash
    turns), exit=0, 78-line patch touching mysql/oracle/postgresql operations.py.
    (slash expansion injects the skill body as the prompt — NOT a `Skill` tool_use)
- [x] Docs: SDS §3.22 + SRS FR-BENCH-SWE describe the operator-driven arm.
  - Evidence: `deno task check` green (exit 0; 500 + 173 tests pass, 0 failed cmds)

## Solution

1. `operator.ts`: `ScriptedOperator` + pure turn builders `base`, `planTurn`,
   `implementTurn`, `reviewTurn`.
2. `run.ts`: flowai `opts.prompt = planTurn(...)`; `maxSteps = followups+1`;
   pass `new ScriptedOperator([implementTurn(), reviewTurn()])` to
   `runWithTimeout` → `agent.run(operator)`. baseline unchanged.
3. Smoke 1 instance, grep transcript for `Skill`.
4. Doc sync.
