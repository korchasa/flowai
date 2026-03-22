import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const RejectStopsBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-and-commit-reject";
  name = "Review Rejects and Stops Without Commit";
  skill = "flow-review-and-commit";
  maxSteps = 5;
  stepTimeoutMs = 180_000;
  interactive = true;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit with README stating division-by-zero error handling is required
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Initial commit with calculator spec",
    ]);

    // calc.ts implements divide(a, b) as a / b — no zero check, no error handling.
    // README promises error handling but code lacks it → phantom completion → Request Changes.
  }

  userQuery =
    "/flow-review-and-commit The divide function is implemented, review and commit";

  userPersona =
    `You are a developer who submitted the divide function for review and commit.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results with "Request Changes" verdict, say "OK, I'll fix these issues myself later. Thanks for the review." and STOP.
NEVER ask the agent to fix anything. NEVER ask for another review. Just acknowledge the report.`;

  checklist = [
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes?",
      critical: true,
    },
    {
      id: "review_rejected",
      description:
        "Did the review verdict indicate Request Changes (not Approve) due to missing error handling?",
      critical: true,
    },
    {
      id: "no_commit",
      description:
        "No new commits were created after the initial commit (agent stopped before committing)?",
      critical: true,
    },
    {
      id: "report_shown",
      description:
        "Did the agent output review findings to the user explaining the issues?",
      critical: true,
    },
  ];
}();
