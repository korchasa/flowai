---
date: "2026-09-15"
status: done
implements:
  - FR-ACCEPT.TOKEN-USAGE
tags: [acceptance-tests, cost, instrumentation]
related_tasks: []
---

# Token accounting for the acceptance-test runner

## Goal

Make the cost of an acceptance run visible so cost decisions rest on measurement
instead of guesswork. Today every run prints `Tokens: 0` and `Cost: $0.000000`,
so no one can say which arm — agent, its subagents, or the judge — spends what,
and a proposal to "switch the judge model to save money" cannot be checked
against a number.

## Overview

### Context

The maintainer asked to cut the cost of acceptance runs and proposed comparing
three judge models. Hand-measurement from the artefacts of the 2026-09-15 runs
showed the premise was wrong: the judge is called once per run with a prompt the
size of `judge-evidence.md` (8–130 KB, typically ~25 KB ≈ 6–7k tokens), while one
agent run costs 0.5–5.3M tokens. The judge is under 1% of the bill; 90–95% of it
is cache reads by the agent and its subagents.

That measurement had to be done by hand because the runner records nothing.

### Current State

- `scripts/acceptance-tests/lib/adapters/mod.ts` sets
  `calculateUsage: () => Promise.resolve(null)` with the note "ACP token usage is
  not yet surfaced by the wrapper", so `collectUsage` in `runner.ts` always
  returns `{ tokensUsed: 0 }`.
- `scripts/acceptance-tests/lib/llm.ts` ends `codexChatCompletion` with
  `return { content, usage: undefined }` — the judge and the user emulator report
  nothing.
- `BenchmarkResult.tokensDetails` already exists (`input`/`output`/`cacheRead`/
  `cacheWrite`) but is never populated. `LLMResponse.usage` carries an OpenAI-shaped
  `prompt_tokens`/`completion_tokens` triple that no caller reads.
- `scripts/acceptance-tests/lib/usage.ts` holds a Cursor-era transcript estimator
  (`calculateSessionUsage`, ~4 chars per token). Nothing calls it; only its
  `SessionUsage` type is imported, by `adapters/types.ts`.

Two sources of real numbers exist and both were verified on this host:

1. **The agent and its subagents.** Codex writes `token_count` events into each
   rollout under `CODEX_HOME/sessions/`. The last event of a file carries
   `total_token_usage` with `input_tokens`, `cached_input_tokens`,
   `cache_write_input_tokens`, `output_tokens`, `reasoning_output_tokens`,
   `total_tokens`. `AcpAgent` already receives that `CODEX_HOME` in its env
   (`agentLaunchEnv` spreads the `prepareAcpCodexHome` result), and
   `collectCodexAgentTrace` already reads the same directory.
2. **The judge and the user emulator.** `codex app-server generate-json-schema
   --out <dir>` (codex-cli 0.144.6) declares the notification
   `thread/tokenUsage/updated` with params `{ threadId, turnId, tokenUsage }`,
   where `tokenUsage` is `{ last, total, modelContextWindow }` and both
   breakdowns are `TokenUsageBreakdown = { inputTokens, cachedInputTokens,
   outputTokens, reasoningOutputTokens, totalTokens }`. `AppServerSession`
   currently ignores every notification but `item/completed` and
   `turn/completed`. This is the only route for the judge: it runs with
   `ephemeral: true` and writes no rollout.

### Constraints

- `inputTokens` INCLUDES `cachedInputTokens`, and `outputTokens` INCLUDES
  `reasoningOutputTokens`, in both sources. Summing the raw fields double-counts.
- The app-server breakdown has no cache-write field. Rollouts do, and it has been
  0 in every run measured so far.
- The judge writes no rollout, so its numbers can only come from the protocol.
- Any edit under `scripts/acceptance-tests/lib/` is hashed into the cache key
  (FR-ACCEPT-CACHE), so this change invalidates all 370 cached verdicts. That is
  unavoidable for runner instrumentation and must be stated, not worked around.
- Do NOT change `acceptance-tests/config.json`: it is hashed whole, and it is the
  one file that can be left alone here.
- Code TDD (Deno), not Acceptance Test TDD — no framework primitive changes.

## Definition of Done

- [x] FR-ACCEPT.TOKEN-USAGE: a shared breakdown type splits every count into
      fresh input, cached input, cache write, output and reasoning, and converting
      from either source never double-counts the nested fields.
  - Test: `scripts/acceptance-tests/lib/token_usage_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/token_usage_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: agent usage is read back from the codex rollouts of
      one run — the last `token_count` per rollout, summed across the parent and
      every subagent.
  - Test: `scripts/acceptance-tests/lib/acp/codex_usage_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/codex_usage_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: `AppServerSession` accumulates
      `thread/tokenUsage/updated` per thread and `codexChatCompletion` returns the
      usage of its own turn.
  - Test: `scripts/acceptance-tests/lib/appserver_client_test.ts`,
    `scripts/acceptance-tests/lib/llm_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/appserver_client_test.ts scripts/acceptance-tests/lib/llm_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: a run result carries the agent and judge breakdowns
      and their sum, and the summary prints the five numbers instead of a bare
      total.
  - Test: `scripts/acceptance-tests/lib/token_usage_test.ts` (the fold over the
    arms), `scripts/acceptance-tests/lib/acceptance_report_test.ts` (the printed
    block). `runner_test.ts` spawns real agents and is excluded from the gate, so
    the runner wiring is evidenced by the live run below instead.
  - Evidence: `deno test -A scripts/acceptance-tests/lib/token_usage_test.ts scripts/acceptance-tests/lib/acceptance_report_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: the breakdown survives the verdict cache, and adding
      it does not invalidate entries written before it existed.
  - Test: `scripts/acceptance-tests/lib/cache_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/cache_test.ts`
- [x] Project gate is green.
  - Evidence: `env -u AUTO_INSTALL_PLUGINS deno task check`
- [x] A live run reports non-zero numbers for both arms, and the same split
      reaches the verdict cache.
  - Evidence: `deno task acceptance-tests -f draw-mermaid-diagrams-sequence` then
    `jq '.result.tokensDetails' acceptance-tests/cache/engineering/draw-mermaid-diagrams-sequence/codex.json`

## Solution

1. Add `scripts/acceptance-tests/lib/token_usage.ts`: the `TokenBreakdown` type
   (`freshInput`, `cachedInput`, `cacheWrite`, `output`, `reasoning`, `total`),
   an empty value, an adder, one converter per source, and a formatter. Both
   converters subtract the nested fields.
2. Add `scripts/acceptance-tests/lib/acp/codex_usage.ts`: parse the last
   `token_count` event of one rollout, and sum every rollout under a
   `CODEX_HOME`. Return null when there is none, so a non-codex IDE stays silent.
3. Handle `thread/tokenUsage/updated` in `AppServerSession`, keyed by thread id;
   `run()` returns the turn's text together with that thread's breakdown. Teach
   the fake app-server to emit the notification.
4. `codexChatCompletion` fills `LLMResponse.usage` with the breakdown; replace the
   unread OpenAI-shaped triple. `evaluateChecklist` returns its usage; the
   `UserEmulator` accumulates its own.
5. Give `AcpAgent` an env accessor, change `AgentAdapter.calculateUsage` to take
   the launch env (the session id was never the key to this data), and implement
   it for codex.
6. Reshape `BenchmarkResult.tokensDetails` to `{ agent, judge, total }`, sum in
   `runner.ts`, print the five numbers in the run log and in
   `acceptance_report.ts`, and persist the breakdown through `cache.ts` as an
   optional field so old entries stay valid.

## Result

Measured on 2026-09-15, `draw-mermaid-diagrams-sequence` on codex
(`gpt-5.6-terra` agent, `gpt-5.6-sol` judge):

- agent — 110,982 total (fresh in 23,061, cached in 87,040, cache write 0,
  out 690, reasoning 191)
- judge — 17,703 total (fresh in 17,449, cached in 0, cache write 0, out 220,
  reasoning 34)
- total — 128,685 total (fresh in 40,510, cached in 87,040, cache write 0,
  out 910, reasoning 225)

`scripts/acceptance-tests/lib/usage.ts` was deleted with this change: the
Cursor-era estimator had no caller left once `calculateUsage` stopped taking a
session id.

Landing this invalidates every cached acceptance verdict once — the runner
sources are hashed into the cache key (FR-ACCEPT-CACHE).
