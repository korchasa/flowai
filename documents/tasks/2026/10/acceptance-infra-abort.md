---
date: 2026-10-06
status: done
implements:
  - FR-ACCEPT.INFRA-ABORT
  - FR-ACCEPT-CACHE
---
# Acceptance runner: a server-side abort is an ERROR, not a FAIL [ANC:task:2026-10-acceptance-infra-abort]

## Goal

A scenario whose agent session was cut off by the model provider must never read as a defect of the primitive under test. The sweep has to say "not measured, re-run" for it, and no verdict may be cached from it.

## Overview

### Context

Observed 2026-10-06 on `review-commit-push-trigger-pos-1`, codex arm, `gpt-6-luna` (run `acceptance-tests/runs/2026-10-06T15-29-37`). The ACP session ended with exit code 0 after 0 tool calls. The only agent reply in the trace was `Selected model is at capacity. Please try a different model.` The rollout under `bench-home/.codex/sessions/2026/10/06/rollout-2026-10-06T18-37-50-*.jsonl` ends with:

```json
{"type":"task_complete","last_agent_message":null,"error":{"message":"Selected model is at capacity. Please try a different model.","codex_error_info":"server_overloaded"}, ...}
```

The judge then scored `skill_invoked` as failed, and the run read as a routing defect of `review-commit-push`. A re-run with `--no-cache` passed.

### Current State

- `runner.ts` already recognises one class of harness fault: `detectAuthFailure` matches `HARNESS_FAULT_PATTERNS` (expired OAuth, spend limit) in a trace with 0 tool calls and throws. The throw is caught in `acceptance_runtime.ts::executeTask`, which only logs it: the run is absent from `ctx.results`, from the summary table and from `finalizeRun`, so a one-run sweep whose only scenario died this way exits 0.
- Nothing reads `task_complete.error` from the rollout. The codex ACP bridge turns the error into an ordinary agent message and ends the turn with `end_turn`, so the exit code is 0.
- `codex_error_info` variants in codex-cli 0.159.1 (read from the binary's strings): `context_window_exceeded`, `session_budget_exceeded`, `usage_limit_exceeded`, `rate_limit_exceeded`, `server_overloaded`, `cyber_policy`, `bio_policy`, `misalignment_policy_violation`, `http_connection_failed`, `response_stream_connection_failed`, `internal_server_error`, `unauthorized`, `bad_request`, `invalid_prompt`, `sandbox_error`, `response_stream_disconnected`, `response_too_many_failed_attempts`, `active_turn_not_steerable`, `thread_rollback_failed`, `other`.
- `maybeWriteScenarioCache` writes only when every run of a scenario succeeded.

### Constraints

- No silent retries (user instruction).
- No new fallback: an unclassified turn error stays a scored run, but is printed as a warning.
- Unit test first (Code TDD); `runner_test.ts` is excluded from the gate, so new logic lives in pure functions with their own test files.

## Definition of Done

- [x] FR-ACCEPT.INFRA-ABORT: the rollout's `task_complete.error` is parsed into turn errors with their kind.
  - Test: `scripts/acceptance-tests/lib/acp/codex_rollout_test.ts::parseCodexTurnErrors reads the server_overloaded abort of 2026-10-06`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/codex_rollout_test.ts`
- [x] FR-ACCEPT.INFRA-ABORT: a transport-level kind, or a provider-capacity literal in a trace with 0 tool calls, is classified as an infrastructure abort; a behavioural kind (`context_window_exceeded`) is not.
  - Test: `scripts/acceptance-tests/lib/infra_abort_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/infra_abort_test.ts`
- [x] FR-ACCEPT.INFRA-ABORT: an aborted run is reported as ERROR — its own status in the per-run line, the summary and the HTML report — and makes the sweep exit non-zero; it is never sent to the judge.
  - Test: `scripts/acceptance-tests/lib/acceptance_report_test.ts::an infrastructure error fails the sweep and is listed apart from checklist failures`, `scripts/acceptance-tests/lib/trace_test.ts::TraceLogger: an infrastructure abort reads as ERROR, not FAILED`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acceptance_report_test.ts scripts/acceptance-tests/lib/trace_test.ts`; the judge bypass sits in `runner.ts::runScenario` (`runner_test.ts` is excluded from the gate), checked by `find scripts/acceptance-tests/lib -name '*.ts' -exec deno check {} +`
- [x] FR-ACCEPT-CACHE: a scenario with an infrastructure-error run writes no cache entry.
  - Test: `scripts/acceptance-tests/lib/cache_test.ts::maybeWriteScenarioCache: an infrastructure error writes no verdict`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/cache_test.ts`
- [x] SRS and SDS describe the behaviour.
  - Evidence: `grep -c 'FR-ACCEPT.INFRA-ABORT' documents/requirements.md documents/design.md` (both ≥ 1)
- [x] The gate is green.
  - Evidence: `deno task check` summary line reports 0 failed

## Solution

1. `acp/codex_rollout.ts`: `parseCodexTurnErrors(jsonl)` returns `{ kind, message }` for every `event_msg` of type `task_complete` that carries `error`; `kind` is `codex_error_info` as a string, or the single key of its object form. `collectCodexTurnErrors(codexHome)` walks the same rollout files as `collectCodexAgentTrace`.
2. New `infra_abort.ts`: the set of transport kinds, the capacity literals, and `detectInfraAbort({ logs, toolCallCount, turnErrors })` that returns the abort message or `null`. Turn errors count regardless of tool calls (they are the session's own structured record); text literals count only at 0 tool calls, as the auth patterns already do. `unclassifiedTurnErrors` lists the others for a warning.
3. `runner.ts`: `runAgentWithTimeout` returns the abort instead of throwing; the auth failure joins the same path. `runScenario` logs the agent output to the trace, then returns `buildInfraErrorResult` without judging. `BenchmarkResult` gains `infraError?: string`.
4. `acceptance_runtime.ts`: per-run line prints `ERROR (infrastructure)` with the message; an exception thrown by `runScenario` becomes the same ERROR result instead of vanishing.
5. `acceptance_report.ts`: summary marks the row, a separate `INFRASTRUCTURE ERRORS` block lists the messages, pass rates name the error count, and `finalizeRun` exits 1 with a "re-run" hint.
6. Cache: no code change. `buildInfraErrorResult` sets `success: false`, and `maybeWriteScenarioCache` already writes only when every run succeeded; the new cache test pins that, so it is a regression guard and was green on the old code too.
7. Trace summary card and HTML overview show `ERROR`.
8. SRS: new `FR-ACCEPT.INFRA-ABORT`, one line in FR-ACCEPT-CACHE. SDS §3.4.7.
