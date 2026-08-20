/**
 * The global-timeout path composes the trace a timed-out scenario is scored on.
 * Pinned here rather than in `runner_test.ts` because that file is an
 * integration suite `deno task check` deliberately ignores (see
 * `scripts/task-check.ts` --ignore) — a unit test parked there never runs.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { composeTimeoutLogs } from "./runner.ts";

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
