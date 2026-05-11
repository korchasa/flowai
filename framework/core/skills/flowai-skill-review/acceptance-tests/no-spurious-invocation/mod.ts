import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReviewNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-review-no-spurious-invocation";
  name = "Review — No Spurious Auto-Invocation";
  skill = "flowai-skill-review";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = "In general, is TypeScript strict mode a good practice?";

  checklist = [
    {
      id: "no_review_workflow",
      description:
        "Did the agent NOT execute the flowai-skill-review workflow? Producing a verdict (Approve/Request Changes/Needs Discussion), a [critical]/[warning]/[nit] findings table, or running `git diff` as part of a review procedure indicates spurious auto-invocation.",
      critical: true,
    },
    {
      id: "no_git_diff",
      description:
        "Did the agent NOT run `git diff` / `git status` / `git diff --cached` to gather a review scope?",
      critical: true,
    },
    {
      id: "conceptual_answer",
      description:
        "Did the agent answer the conceptual question directly (discussing strict mode tradeoffs) without entering the review procedure?",
      critical: true,
    },
  ];
}();
