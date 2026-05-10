import { BenchmarkSkillScenario } from "@bench/types.ts";

// Verifies the verdict gate: when the Review-and-Commit Phase reports
// `Request Changes` (because the diff introduces ANY critical issue), the
// workflow stops WITHOUT committing. The exact reason for the rejection is
// not asserted — what's tested is the GATE BEHAVIOUR (verdict ≠ Approve →
// no commit), not the reviewer's choice of which defect to flag first. The
// fixture intentionally seeds a pre-existing failing test (`broken_test.ts`)
// so the project check fails when the agent runs it, virtually guaranteeing
// at least one critical finding when the review proceeds.
export const DoWithPlanRejectsBench = new class extends BenchmarkSkillScenario {
  id = "flowai-do-with-plan-rejects-on-changes-requested";
  name = "Verdict gate stops the workflow on Request Changes";
  skill = "flowai-do-with-plan";
  maxSteps = 70;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_500_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a planning variant, pick the first one. Keep answers short. Treat the project's existing baseline as out of scope — only complete the requested feature.";

  userQuery =
    "/flowai-do-with-plan Add a `multiply(a: number, b: number): number` function in math.ts with a Deno test. Touches FR-MATH.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent plans + implements multiply.ts. Either the Implement -> Review gate halts on the failing pre-existing test, OR Phase-3 review surfaces a critical finding and returns Request Changes. Either way the workflow stops WITHOUT committing. `git log` after the run equals the count before agent start.",
  };

  checklist = [
    {
      id: "verdict_or_gate_blocked_progression",
      description:
        "Did the workflow stop somewhere between the Implement Phase and the actual `git commit`? Either Phase-3 produced a Request Changes / Needs Discussion verdict, OR the Implement -> Review gate halted on a failed project check, OR the Verdict Gate paragraph fired on Phase-3 output. Any of these is acceptable — what matters is that the agent did NOT reach a successful commit.",
      critical: true,
    },
    {
      id: "no_commit_landed",
      description:
        "After the gate / verdict halted the workflow, did the agent NOT run `git commit`? `git log --oneline` should show only the runner's `init` commit (no new commits beyond the seed).",
      critical: true,
    },
    {
      id: "structured_review_or_gate_message",
      description:
        "Did the agent surface either (a) a structured review report with severity tags (`[critical]` / `[warning]` / `[nit]`) and an explicit verdict line, OR (b) an explicit Implement -> Review gate-stop message naming the failed check / blocked condition? At least one such structured artifact must appear in the transcript.",
      critical: true,
    },
    {
      id: "plan_file_still_committed_state",
      description:
        "Plan Phase wrote the task file but it should remain uncommitted (working-tree state), not committed — because the gate halted the commit step.",
      critical: false,
    },
  ];
}();
