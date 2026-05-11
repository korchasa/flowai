import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Implement -> Review-and-Commit gate: when the implement phase produces NO
// diff (the requested feature already exists, or the user clarifies the work
// is already done), the workflow MUST stop without entering Review/Commit.
// Fixture pre-seeds the requested feature; a thoughtful agent will discover
// nothing to implement.
export const DoWithPlanEmptyImplementBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-do-with-plan-empty-implement-stops";
  name =
    "Implement -> Review gate: empty diff after implement halts the workflow";
  skill = "flowai-do-with-plan";
  maxSteps = 60;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_500_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a planning variant, pick the first one. If the agent reports the requested feature already exists, CONFIRM that no further changes are needed — do not ask for cosmetic edits. Keep answers short.";

  userQuery =
    "/flowai-do-with-plan Add an `add(a: number, b: number): number` function in math.ts with a Deno test. Touches FR-MATH.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent plans, then in implement phase discovers `add` and its test already exist (seeded by fixture), produces no diff, and the Implement -> Review gate halts the workflow. No commit lands. Agent surfaces an explicit 'no changes — task may be a no-op' message.",
  };

  checklist = [
    {
      id: "no_implementation_diff",
      description:
        "After Implement Phase, did `git diff` and `git status` show no source-code changes (the feature already existed)? The task file under `documents/tasks/` may be the only modified file.",
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
        "`git log --oneline` shows only the runner's `init` commit — no new commits.",
      critical: true,
    },
    {
      id: "explicit_gate_stop_message",
      description:
        "Did the agent surface an explicit message that no implementation diff was produced (Implement -> Review gate halted the workflow because git status was clean)?",
      critical: true,
    },
  ];
}();
