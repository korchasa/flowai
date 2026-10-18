/**
 * Recognise an agent session the model provider cut off, and turn it into an
 * ERROR result instead of a checklist verdict
 * ([REF:fr:accept.infra-abort | FR-ACCEPT.INFRA-ABORT]).
 *
 * Observed 2026-10-06 on `review-commit-push-trigger-pos-1`, codex arm: the
 * provider answered `Selected model is at capacity` before the agent's first
 * tool call. The codex ACP bridge forwarded that text as an ordinary reply and
 * ended the turn with `end_turn`, the session exited 0, the judge failed
 * `skill_invoked`, and the run read as a routing defect of the skill. A re-run
 * passed. Nothing in such a run measures the primitive, so it is neither sent
 * to the judge nor cached; the sweep reports it apart and asks for a re-run.
 * There is no retry here on purpose: whether to re-run is the operator's call.
 */
import type { CodexTurnError } from "./acp/codex_rollout.ts";
import type { BenchmarkResult } from "./types.ts";

/**
 * `codex_error_info` variants that are the provider's or the network's fault,
 * not the agent's. Read from the variant list of codex-cli 0.159.1.
 *
 * Left out on purpose: `context_window_exceeded` and `session_budget_exceeded`
 * (the agent spent them), the policy refusals and `invalid_prompt` (they
 * answer what the agent sent), `bad_request`, `sandbox_error`,
 * `active_turn_not_steerable`, `thread_rollback_failed` and `other` (no
 * evidence they are transport). Those stay scored and are printed as a warning.
 */
export const TRANSPORT_ERROR_KINDS: ReadonlySet<string> = new Set([
  "server_overloaded",
  "internal_server_error",
  "http_connection_failed",
  "response_stream_connection_failed",
  "response_stream_disconnected",
  "response_too_many_failed_attempts",
  "rate_limit_exceeded",
  "usage_limit_exceeded",
  "unauthorized",
]);

/**
 * The same faults as text, for a session that left no rollout to read (the
 * claude arm) or whose rollout is missing. Matched only at 0 tool calls, like
 * the auth patterns in `runner.ts`: once the agent has run commands, the text
 * may come from a CLI it drove, and that is an observation, not our fault.
 *
 * - `Selected model is at capacity` — codex's message for `server_overloaded`,
 *   verbatim from the 2026-10-06 trace.
 * - `overloaded_error` — the error type of Anthropic's HTTP 529 body.
 */
export const TRANSPORT_FAULT_PATTERNS: readonly string[] = [
  "Selected model is at capacity",
  "overloaded_error",
];

export interface InfraAbortInput {
  /** The ACP trace of the session. */
  logs: string;
  /** Tool calls the session made. */
  toolCallCount: number;
  /** Turn errors from the session's rollouts (codex only; empty elsewhere). */
  turnErrors: readonly CodexTurnError[];
}

const NOT_MEASURED =
  "Nothing measured here is a behavioural result — the session never " +
  "finished the task. Not judged, not cached; re-run the scenario.";

/** The abort message when the session was cut off by the provider, else `null`. */
export function detectInfraAbort(input: InfraAbortInput): string | null {
  // A turn error is the session's own structured record, so it counts even
  // after tool calls: the turn was cut off mid-way, and the rest of the
  // checklist would be scored on a half-finished run.
  const turn = input.turnErrors.find((e) => TRANSPORT_ERROR_KINDS.has(e.kind));
  if (turn) {
    return `Agent session aborted by the model provider (codex turn error ` +
      `"${turn.kind}": ${turn.message}). ${NOT_MEASURED}`;
  }
  if (input.toolCallCount > 0) return null;
  const hit = TRANSPORT_FAULT_PATTERNS.find((p) => input.logs.includes(p));
  if (!hit) return null;
  return `Agent session aborted by the model provider (matched: "${hit}"). ` +
    NOT_MEASURED;
}

/** Turn errors that are not classified as transport faults — scored, but worth a warning. */
export function unclassifiedTurnErrors(
  turnErrors: readonly CodexTurnError[],
): CodexTurnError[] {
  return turnErrors.filter((e) => !TRANSPORT_ERROR_KINDS.has(e.kind));
}

/**
 * The result of a run the harness could not measure: an aborted session, a
 * dead login, or an exception inside the runner.
 *
 * `success: false` keeps it out of the cache (FR-ACCEPT-CACHE writes only
 * when every run passed) and fails the sweep. `errorsCount` stays 0 and the
 * checklist stays empty, because no checklist item was ever decided.
 */
export function buildInfraErrorResult(
  scenarioId: string,
  model: string,
  message: string,
  logs: string,
  durationMs = 0,
): BenchmarkResult {
  return {
    scenarioId,
    success: false,
    score: 0,
    errorsCount: 0,
    warningsCount: 0,
    durationMs,
    tokensUsed: 0,
    totalCost: 0,
    toolCallsCount: 0,
    model,
    checklistResults: {},
    logs,
    infraError: message,
  };
}
