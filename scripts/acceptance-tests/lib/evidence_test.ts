import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  formatJudgeEvidence,
  type JudgeEvidenceParts,
  MAX_DIFF_LEN,
  MAX_TRACE_LEN,
  truncateDiff,
  truncateTrace,
} from "./evidence.ts";

function parts(over: Partial<JudgeEvidenceParts> = {}): JudgeEvidenceParts {
  return {
    expectedOutcome: "outcome",
    gitStatus: "status",
    gitLog: "log",
    committedDiff: "committed",
    workingTreeDiff: "working",
    taskFiles: "tasks",
    generatedFiles: "generated",
    ...over,
  };
}

Deno.test("formatJudgeEvidence surfaces the uncommitted working tree diff", () => {
  const out = formatJudgeEvidence(parts({
    workingTreeDiff: "+1. Run tests before committing: `poetry run pytest`",
  }));
  assertStringIncludes(
    out,
    "--- GIT DIFF (uncommitted working tree vs HEAD) ---",
  );
  assertStringIncludes(out, "poetry run pytest");
});

Deno.test("formatJudgeEvidence keeps the committed diff distinguishable from the agent's own", () => {
  const out = formatJudgeEvidence(parts({
    committedDiff: "+1. Run tests before committing: `deno test`",
    workingTreeDiff: "+1. Run tests before committing: `poetry run pytest`",
  }));
  const committedAt = out.indexOf("--- GIT DIFF (init..HEAD) ---");
  const workingAt = out.indexOf(
    "--- GIT DIFF (uncommitted working tree vs HEAD) ---",
  );
  assertEquals(committedAt < workingAt, true);
  assertStringIncludes(
    out.slice(workingAt),
    "may consist\nentirely of commits made by the scenario setup",
  );
});

Deno.test("truncateDiff elides only past the cap", () => {
  assertEquals(truncateDiff("short"), "short");
  const big = "x".repeat(MAX_DIFF_LEN + 10);
  const cut = truncateDiff(big);
  assertEquals(cut.startsWith("x".repeat(MAX_DIFF_LEN)), true);
  assertStringIncludes(cut, "[DIFF TRUNCATED]");
});

Deno.test("truncateTrace keeps every turn when the trace overflows", () => {
  // Shape of maintenance-tooling-relevance in the sweep of 2026-08-28: one huge
  // scan turn, then short interactive turns carrying the decisive evidence.
  const scan = `\n[turn 1] > /maintenance\n< ${"scan ".repeat(40_000)}\n`;
  const loop = [2, 3, 4, 5, 6].map((n) =>
    `\n[turn ${n}] > Apply fix\n< Finding ${n}: **Apply** | **Skip** | **Edit**?\n`
  ).join("");
  const tail = [7, 8, 9].map((n) =>
    `\n[turn ${n}] > Tooling Relevance\n< ${"done ".repeat(9_000)}\n`
  ).join("");
  const out = truncateTrace(scan + loop + tail, MAX_TRACE_LEN);

  for (let n = 1; n <= 9; n++) {
    assertStringIncludes(out, `[turn ${n}] > `);
  }
  assertEquals(out.split("**Apply** | **Skip** | **Edit**?").length - 1, 5);
});

Deno.test("truncateTrace leaves a trace under the cap untouched", () => {
  const small = "\n[turn 1] > hi\n< there\n";
  assertEquals(truncateTrace(small, MAX_TRACE_LEN), small);
});

Deno.test("truncateTrace falls back to head+tail when the trace has no turns", () => {
  const flat = "y".repeat(MAX_TRACE_LEN * 2);
  const out = truncateTrace(flat, MAX_TRACE_LEN);
  assertStringIncludes(out, "TRUNCATED");
  assertEquals(out.length <= MAX_TRACE_LEN + 200, true);
});
