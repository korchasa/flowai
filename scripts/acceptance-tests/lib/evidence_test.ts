import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  formatJudgeEvidence,
  type JudgeEvidenceParts,
  MAX_DIFF_LEN,
  truncateDiff,
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
