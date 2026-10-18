---
date: 2026-10-17
status: done
implements:
  - FR-ACCEPT.JUDGE-ACP
  - FR-ACCEPT.TOKEN-USAGE
---
# Acceptance judge and user emulator on claude-sonnet-5-5 over the claude ACP bridge

## Goal

The acceptance judge scores runs with the same model the default arm runs
(`claude-sonnet-5-5`), so a verdict no longer depends on a second vendor's
model and a second subscription's rate-limit window.

## Overview

### Context

On 2026-10-17 the default acceptance arm moved to claude with agent model
`claude-sonnet-5-5`. The user then asked for the judge to run on the same model
and chose (2026-10-17):

- transport: a prewarmed session through the claude ACP bridge
  (`@agentclientprotocol/claude-agent-acp`), the bridge the agent arm already
  runs on;
- scope: every arm's judge (claude, codex, cursor) becomes `claude-sonnet-5-5`;
- the acceptance user emulator moves with the judge (it already receives the
  judge's config).

The SWE-rebench benchmark's human emulator (`scripts/benchmark/human_emulator.ts`)
calls `codexChatCompletion` directly and is out of scope.

### Current State

- `codexChatCompletion` (`scripts/acceptance-tests/lib/llm.ts`) is the only LLM
  transport. It speaks `codex app-server` (FR-ACCEPT.JUDGE-APPSERVER), takes an
  `outputSchema` that constrains the reply, and returns `{content, usage}`.
- `evaluateChecklist` (`judge.ts`) and `UserEmulator` (`user_emulator.ts`)
  default their `llmClient` to it. `runner.ts` builds the judge config
  (`buildJudgeConfig`, codex-only env), prewarms the codex session, and
  `task-acceptance-tests.ts` closes codex sessions at the end of a run.
- A probe on 2026-10-17 (bridge 0.81.0, `ANTHROPIC_MODEL=claude-sonnet-5-5`)
  measured: `newSession` with `_meta.claudeCode.options = {tools: [],
  settingSources: [], effort: "medium", systemPrompt: <short>}` costs
  1.7–2.1 s, a prompt 2.2–3.3 s, and a call spends ~506 tokens instead of
  31,793 with the default Claude Code system prompt. `PromptResponse.usage`
  carries `{inputTokens, outputTokens, cachedReadTokens, cachedWriteTokens,
  totalTokens}`, disjoint, and `_meta.quota.model_usage[].model` confirms the
  model.
- The bridge has no structured-output parameter: the reply is text.

### Constraints

- The judge reply must still be a schema-valid verdict: parse JSON out of the
  text and validate it against the request's schema; a mismatch throws, so the
  judge's existing one-retry path handles it. No silent fallback to codex.
- The judge must not touch the user's real `HOME`: it runs under a per-run temp
  home built like the agent's (`prepareAcpClaudeHome`).
- Changing the judge model resets every cached verdict (`judgeModel` is in the
  cache key) — inherent, recorded, not worked around.
- `acceptance-tests/config.json`, `AGENTS.md`, `documents/requirements.md` and
  `documents/design.md` carry uncommitted edits of other work; touch only this
  task's lines.

## Definition of Done

- [x] FR-ACCEPT.JUDGE-ACP: a reply wrapped in a code fence or prose yields the JSON object; a missing required key, a wrong type or an extra key throws naming the field
  - Test: `scripts/acceptance-tests/lib/acp/claude_judge_test.ts::parseStructuredReply-*`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/claude_judge_test.ts`
- [x] FR-ACCEPT.JUDGE-ACP: a call opens a session with no tools, no setting sources and the pinned effort, sets `ANTHROPIC_MODEL`, closes the session, and two calls share one bridge process
  - Test: `scripts/acceptance-tests/lib/acp/claude_judge_test.ts::claudeChatCompletion-*`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/claude_judge_test.ts`
- [x] FR-ACCEPT.JUDGE-ACP: the transport dispatcher sends `claude*` models over ACP and every other model over the codex app-server
  - Test: `scripts/acceptance-tests/lib/judge_transport_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/judge_transport_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: ACP `PromptResponse.usage` converts to a `TokenBreakdown`
  - Test: `scripts/acceptance-tests/lib/acp/claude_judge_test.ts::tokensFromAcpUsage-*`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/claude_judge_test.ts`
- [x] FR-ACCEPT.JUDGE-ACP: every arm's judge in `acceptance-tests/config.json` is `claude-sonnet-5-5` with a pinned effort
  - Test: `scripts/acceptance-tests/lib/config_test.ts::acceptance-tests/config.json: the default arm is claude, every judge runs on claude-sonnet-5-5`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/config_test.ts`
- [x] FR-ACCEPT.JUDGE-ACP: a claude judge runs under a per-run home that is not the user's `HOME`; a codex judge keeps its codex home
  - Test: `scripts/acceptance-tests/lib/runner_test.ts::a claude judge runs under the run's claude judge home`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_test.ts`
- [x] FR-ACCEPT.JUDGE-ACP: a live scenario is judged over ACP and reports non-zero judge tokens
  - Evidence: `deno task acceptance-tests -f draw-mermaid-diagrams --no-cache` passes and its log has a non-zero `Tokens (judge)` line
- [x] SRS and SDS describe the claude judge transport
  - Evidence: `grep -c 'FR-ACCEPT.JUDGE-ACP' documents/requirements.md documents/design.md` prints at least 1 for each file
- [x] The project gate is green
  - Evidence: `deno task check` ends with `0 failed`

## Solution

1. SRS: add `FR-ACCEPT.JUDGE-ACP`; update the "Default arm" line of FR-ACCEPT and
   the scope of FR-ACCEPT.JUDGE-APPSERVER and FR-ACCEPT.TOKEN-USAGE. SDS: a new
   §3.4.7 and the judge sentence in the config bullet.
2. RED: extend `scripts/acceptance-tests/lib/acp/stub_agent.ts` (record `_meta`,
   `closeSession`, a `[[REPLY]]…[[/REPLY]]` marker that returns the text verbatim
   with `usage`, a `[[META]]` marker that reports what the stub saw); write
   `acp/claude_judge_test.ts` and `judge_transport_test.ts`; update
   `config_test.ts`. Run them — they fail.
3. GREEN: `acp/claude_judge.ts` — a pool of bridge processes keyed by model,
   effort, env and cwd; per call `newSession` → `prompt` → `closeSession`; the
   prompt is `codexPrompt(messages)` plus, when a schema is given, an
   instruction to reply with one JSON object and the schema itself; the reply is
   parsed and validated, and `usage` comes from `PromptResponse.usage`.
   `judge_transport.ts` dispatches by model name and owns prewarm and close.
   `auth.ts` gains `runClaudeJudgeHome()`; `runner.ts` builds the judge config
   per judge model; `judge.ts`, `user_emulator.ts` and
   `task-acceptance-tests.ts` use the dispatcher.
4. Switch the three judges in `acceptance-tests/config.json`.
5. Run one live scenario, `runner_test.ts` by hand, and `deno task check`.
