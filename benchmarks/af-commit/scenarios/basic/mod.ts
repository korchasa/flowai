import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const CommitBasicBench = new class extends BenchmarkSkillScenario {
  id = "af-commit-basic";
  name = "Basic Feature Commit";
  skill = "af-commit";

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit with README, AGENTS.md and .cursor
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md", ".cursor"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is already in sandbox but NOT in git yet.
    // This makes it an untracked file, which is what the scenario expects.
  }

  userQuery =
    "/af-commit I added a sum function in utils.ts. Commit this changes.";

  checklist = [
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "commit_message_match",
      description: "Does the commit message describe sum function?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description: "Does the commit message follow Conventional Commits?",
      critical: false,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
