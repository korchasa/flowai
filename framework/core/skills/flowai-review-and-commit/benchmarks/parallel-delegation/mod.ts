import { BenchmarkSkillScenario } from "@bench/types.ts";
import { runGit } from "@bench/utils.ts";

export const ParallelDelegationBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-review-and-commit-parallel-delegation";
  name =
    "Review-and-commit delegates checks in parallel and reuses results in commit phase";
  skill = "flowai-review-and-commit";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "DataProcessor",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove processor.ts from tracking",
      files: ["processor.ts"],
    }],
    untracked: ["processor.ts"],
    expectedOutcome:
      "Agent reviews a large diff (>50 lines), delegates checks in parallel during Phase 1, reuses results in Phase 2 (commit), and commits successfully",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "processor.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove processor.ts from tracking",
    ]);
  }

  userQuery =
    "/flowai-review-and-commit Review and commit the data processor implementation";

  userPersona =
    `You are a developer who submitted a large data processor for review and commit.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "parallel_delegation",
      description:
        "Did the agent delegate automated checks or hygiene scan to a background agent/task during Phase 1 (review) instead of running everything sequentially?",
      critical: true,
    },
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes (Phase 1)?",
      critical: true,
    },
    {
      id: "review_approved",
      description:
        "Did the review verdict indicate Approve (no critical issues)?",
      critical: true,
    },
    {
      id: "automated_checks_in_report",
      description:
        "Does the review report include automated check results (pass/fail)?",
      critical: true,
    },
    {
      id: "no_duplicate_checks",
      description:
        "Did the agent avoid re-running automated checks in Phase 2 (commit) by reusing Phase 1 results? The agent should NOT run the project check command twice.",
      critical: true,
    },
    {
      id: "file_committed",
      description: "Is `processor.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked or modified files)?",
      critical: true,
    },
    {
      id: "two_phases_sequential",
      description:
        "Did the agent complete Phase 1 (review) fully BEFORE starting Phase 2 (commit)?",
      critical: true,
    },
  ];
}();
