/**
 * The global-timeout path composes the trace a timed-out scenario is scored on.
 * Pinned here rather than in `runner_test.ts` because that file is an
 * integration suite `deno task check` deliberately ignores (see
 * `scripts/task-check.ts` --ignore) — a unit test parked there never runs.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  composeTimeoutLogs,
  detectAuthFailure,
  detectHarnessFaultWarning,
  renderFileForEvidence,
  shouldInjectExitCodeCheck,
} from "./runner.ts";

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
    0,
  );
  assertEquals(typeof msg, "string");
  assertStringIncludes(msg!, "not authenticated");
  assertStringIncludes(msg!, ".env");
});

Deno.test("detectAuthFailure: stays silent on an ordinary trace", () => {
  assertEquals(
    detectAuthFailure("[turn 1] > run the tests\nAll 12 tests passed.", 0),
    null,
  );
});

Deno.test("detectAuthFailure: a child CLI's auth error is not ours", () => {
  assertEquals(
    detectAuthFailure(
      "[tool-calls] Bash: claude -p 'hi'\nOAuth session expired",
      4,
    ),
    null,
  );
});

Deno.test("shouldInjectExitCodeCheck: a routing scenario survives the global timeout", () => {
  const routing = [{ id: "skill_not_invoked" }];
  assertEquals(shouldInjectExitCodeCheck(routing, 124, 89), false);
});

Deno.test("shouldInjectExitCodeCheck: an empty trace is never forgiven", () => {
  const routing = [{ id: "skill_not_invoked" }];
  assertEquals(shouldInjectExitCodeCheck(routing, 124, 0), true);
});

Deno.test("shouldInjectExitCodeCheck: only the timeout is forgiven, not a crash", () => {
  const routing = [{ id: "skill_invoked" }];
  assertEquals(shouldInjectExitCodeCheck(routing, 1, 40), true);
});

Deno.test("shouldInjectExitCodeCheck: a behavioural checklist keeps the exit-code item", () => {
  const behavioural = [{ id: "skill_invoked" }, { id: "wrote_the_file" }];
  assertEquals(shouldInjectExitCodeCheck(behavioural, 124, 89), true);
});

Deno.test("shouldInjectExitCodeCheck: a clean exit never adds the item", () => {
  assertEquals(
    shouldInjectExitCodeCheck([{ id: "skill_invoked" }], 0, 3),
    false,
  );
});

Deno.test("renderFileForEvidence keeps a small file whole", () => {
  const out = renderFileForEvidence("AGENTS.md", "# Title\nbody", 100);
  assertStringIncludes(out, "--- AGENTS.md ---");
  assertStringIncludes(out, "body");
});

Deno.test("renderFileForEvidence keeps the tail of a large file — head-only truncation is how a present section reads as absent", () => {
  const content = "HEAD-MARKER\n" + "x".repeat(500) +
    "\n## Documentation Rules";
  const out = renderFileForEvidence("AGENTS.md", content, 100);
  assertStringIncludes(out, "HEAD-MARKER");
  assertStringIncludes(out, "## Documentation Rules");
});

Deno.test("renderFileForEvidence tells the judge the gap is not evidence of absence", () => {
  const out = renderFileForEvidence("AGENTS.md", "y".repeat(400), 100);
  assertStringIncludes(out, "HARNESS ELIDED");
  assertStringIncludes(out, "NOT evidence");
});

Deno.test("detectHarnessFaultWarning flags a credits error that arrived mid-session", () => {
  const msg = detectHarnessFaultWarning(
    "...Usage credits required for 1M context",
    12,
  );
  assertStringIncludes(msg!, "harness fault");
});

Deno.test("detectHarnessFaultWarning stays quiet when the trace is empty — that case throws instead", () => {
  assertEquals(detectHarnessFaultWarning("Usage credits required", 0), null);
});
