import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReviewEmptyDiffBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-review-empty-diff";
  name = "Review Stops on Empty Diff";
  skill = "flowai-skill-review";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome: "Agent detects no changes to review and stops early",
  };

  // No setup needed — sandbox is clean after init commit

  userQuery = "/flowai-skill-review Review the changes";

  checklist = [
    {
      id: "diff_checked",
      description:
        "Did the agent check git diff or git status to identify changes?",
      critical: true,
    },
    {
      id: "empty_diff_detected",
      description:
        "Did the agent detect there are no changes to review (empty diff)?",
      critical: true,
    },
    {
      id: "early_stop",
      description:
        "Did the agent stop early and inform the user there is nothing to review (no full review executed)?",
      critical: true,
    },
    {
      id: "no_commit",
      description: "The agent did NOT commit any changes?",
      critical: true,
    },
  ];
}();
