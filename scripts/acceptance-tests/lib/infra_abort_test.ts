import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { detectInfraAbort, unclassifiedTurnErrors } from "./infra_abort.ts";

const OVERLOADED = {
  kind: "server_overloaded",
  message: "Selected model is at capacity. Please try a different model.",
};

// What the ACP trace of `review-commit-push-trigger-pos-1` held on 2026-10-06:
// the provider's refusal arrived as the agent's only reply.
const CAPACITY_TRACE =
  "[turn 1] > Review my uncommitted changes, commit them if they hold up, and push the branch.\n" +
  "< Selected model is at capacity. Please try a different model.\n";

Deno.test("detectInfraAbort: the 2026-10-06 capacity abort is not a behavioural result", () => {
  const msg = detectInfraAbort({
    logs: CAPACITY_TRACE,
    toolCallCount: 0,
    turnErrors: [OVERLOADED],
  });
  assert(msg);
  assertStringIncludes(msg, "server_overloaded");
  assertStringIncludes(msg, "Selected model is at capacity");
  assertStringIncludes(msg, "re-run");
});

Deno.test("detectInfraAbort: a turn the provider cut off mid-session is an abort too", () => {
  const msg = detectInfraAbort({
    logs: "[tool-call] Bash: git status\n",
    toolCallCount: 4,
    turnErrors: [{
      kind: "response_stream_disconnected",
      message: "stream disconnected before completion",
    }],
  });
  assert(msg);
  assertStringIncludes(msg, "response_stream_disconnected");
});

Deno.test("detectInfraAbort: an error the agent caused itself stays a scored run", () => {
  const turnErrors = [{
    kind: "context_window_exceeded",
    message: "Your input exceeds the context window of this model.",
  }];
  assertEquals(
    detectInfraAbort({ logs: "", toolCallCount: 40, turnErrors }),
    null,
  );
  assertEquals(unclassifiedTurnErrors(turnErrors), turnErrors);
  assertEquals(unclassifiedTurnErrors([OVERLOADED]), []);
});

Deno.test("detectInfraAbort: the capacity text alone is enough when the session made no tool call", () => {
  const msg = detectInfraAbort({
    logs: CAPACITY_TRACE,
    toolCallCount: 0,
    turnErrors: [],
  });
  assert(msg);
  assertStringIncludes(msg, "Selected model is at capacity");
});

Deno.test("detectInfraAbort: the claude arm's overloaded error at 0 tool calls is an abort", () => {
  // Anthropic's documented error body for HTTP 529, as the claude bridge
  // forwards an API error inside an `[acp-error]` line.
  const logs = '[acp-error] {"acpError":"Internal error: API Error: 529 ' +
    '{\\"type\\":\\"error\\",\\"error\\":{\\"type\\":\\"overloaded_error\\",\\"message\\":\\"Overloaded\\"}}"}\n';
  const msg = detectInfraAbort({ logs, toolCallCount: 0, turnErrors: [] });
  assert(msg);
  assertStringIncludes(msg, "overloaded_error");
});

Deno.test("detectInfraAbort: capacity text from a CLI the agent drove is not ours", () => {
  assertEquals(
    detectInfraAbort({
      logs:
        "[tool-call] Bash: codex exec 'hi'\n  Selected model is at capacity.\n",
      toolCallCount: 2,
      turnErrors: [],
    }),
    null,
  );
});

Deno.test("detectInfraAbort: stays silent on an ordinary trace", () => {
  assertEquals(
    detectInfraAbort({
      logs: "[turn 1] > run the tests\n< All 12 tests passed.\n",
      toolCallCount: 0,
      turnErrors: [],
    }),
    null,
  );
});
