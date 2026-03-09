import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const ApproveAndCommitBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-and-commit-approve";
  name = "Review Approve then Commit";
  skill = "flow-review-and-commit";
  maxSteps = 20;
  stepTimeoutMs = 180_000;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit with README and AGENTS.md (skip IDE config dir — varies by adapter)
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is in sandbox but NOT in git — untracked file for the agent to review and commit
  }

  userQuery =
    "/flow-review-and-commit Review and commit the added sum function";

  checklist = [
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes?",
      critical: true,
    },
    {
      id: "review_approved",
      description:
        "Did the review verdict indicate Approve (no critical issues)?",
      critical: true,
    },
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description:
        "Does the commit message follow Conventional Commits format?",
      critical: false,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked or modified files)?",
      critical: true,
    },
  ];
}();
