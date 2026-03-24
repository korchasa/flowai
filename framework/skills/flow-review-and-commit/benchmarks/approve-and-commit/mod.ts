import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";

export const ApproveAndCommitBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-and-commit-approve";
  name = "Review Approve then Commit";
  skill = "flow-review-and-commit";
  maxSteps = 20;
  stepTimeoutMs = 180_000;
  interactive = true;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Add .gitignore to exclude IDE config dir from git status
    await Deno.writeTextFile(
      join(sandboxPath, ".gitignore"),
      ".claude/\n.cursor/\n",
    );

    // Initial commit with README, AGENTS.md, and .gitignore
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md", ".gitignore"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is in sandbox but NOT in git — untracked file for the agent to review and commit
  }

  userQuery =
    "/flow-review-and-commit Review and commit the added sum function";

  userPersona =
    `You are a developer who submitted clean code for review and commit.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
Keep answers brief and affirmative.`;

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
    {
      id: "no_reflect_suggestion",
      description:
        "Did the agent correctly skip the /flow-reflect suggestion? In a simple session without errors, retries, or user corrections, the agent must NOT suggest running /flow-reflect.",
      critical: false,
    },
  ];
}();
