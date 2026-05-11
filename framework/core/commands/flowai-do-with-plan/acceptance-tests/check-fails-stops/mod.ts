import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Implement -> Review-and-Commit gate: when project check (deno test) fails
// after the implement phase, the workflow MUST stop without entering Review.
// Fixture seeds a pre-existing failing test (`broken_test.ts`); the agent's
// implementation work cannot mask that failure, so `deno task check` exits
// non-zero. Composite gate halts before Phase 3.
export const DoWithPlanCheckFailsBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-do-with-plan-check-fails-stops";
  name = "Implement -> Review gate: project check failure halts the workflow";
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
    "A pragmatic developer. When asked to choose a planning variant, pick the first one. Keep answers short. Do NOT instruct the agent to fix the pre-existing broken_test.ts — only the requested feature.";

  userQuery =
    "/flowai-do-with-plan Add a `subtract(a: number, b: number): number` function in math.ts with a Deno test. Touches FR-MATH. The pre-existing broken_test.ts is unrelated — leave it alone.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent plans, implements subtract.ts + subtract_test.ts, runs `deno task check` (or equivalent), it fails because broken_test.ts already fails. Agent recognises the gate condition (project check ≠ 0) and stops WITHOUT entering Review-and-Commit Phase. No commit lands.",
  };

  checklist = [
    {
      id: "check_was_executed",
      description:
        "Did the agent run a project check command (`deno task check` / `deno test` / equivalent) after implementing? Inspect tool-call traces.",
      critical: true,
    },
    {
      id: "check_failed",
      description:
        "Did the project check exit with a non-zero status (because of pre-existing `broken_test.ts`)?",
      critical: true,
    },
    {
      id: "no_review_phase_executed",
      description:
        "Did the agent NOT proceed into Review-and-Commit Phase? Inspect transcript: NO structured review report with `## Review: [Approve|Request Changes|Needs Discussion]` should appear.",
      critical: true,
    },
    {
      id: "no_commit_landed",
      description:
        "After the workflow stopped, `git log --oneline` shows only the runner's `init` commit — no new commits.",
      critical: true,
    },
    {
      id: "explicit_gate_stop_message",
      description:
        "Did the agent surface an explicit message that the Implement -> Review-and-Commit gate halted the workflow (mentioning the failing project check)?",
      critical: false,
    },
  ];
}();
