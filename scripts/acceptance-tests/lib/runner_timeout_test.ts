/**
 * The global-timeout path composes the trace a timed-out scenario is scored on.
 * Pinned here rather than in `runner_test.ts` because that file is an
 * integration suite `deno task check` deliberately ignores (see
 * `scripts/task-check.ts` --ignore) — a unit test parked there never runs.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { composeTimeoutLogs, detectAuthFailure } from "./runner.ts";

Deno.test("composeTimeoutLogs keeps the partial trace so a timed-out run stays diagnosable", () => {
  const out = composeTimeoutLogs(
    "[tool-calls]\nBash: deno test -A src/",
    "Global scenario timeout after 1800000ms",
  );
  assertStringIncludes(out, "Bash: deno test -A src/");
  assertStringIncludes(out, "[GLOBAL TIMEOUT]");
  assert(out.indexOf("Bash:") < out.indexOf("[GLOBAL TIMEOUT]"));
});

Deno.test("composeTimeoutLogs returns the marker alone when nothing was captured", () => {
  assertEquals(
    composeTimeoutLogs("", "Global scenario timeout after 900000ms"),
    "[GLOBAL TIMEOUT] Global scenario timeout after 900000ms",
  );
});

Deno.test("detectAuthFailure: names the expired session and the remedy", () => {
  const msg = detectAuthFailure(
    "Failed to authenticate: OAuth session expired and could not be refreshed",
  );
  assertEquals(typeof msg, "string");
  assertStringIncludes(msg!, "not authenticated");
  assertStringIncludes(msg!, ".env");
});

Deno.test("detectAuthFailure: stays silent on an ordinary trace", () => {
  assertEquals(
    detectAuthFailure("[turn 1] > run the tests\nAll 12 tests passed."),
    null,
  );
});
