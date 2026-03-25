import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../../scripts/benchmarks/lib/utils.ts";

export const CommitBasicBench = new class extends BenchmarkSkillScenario {
  id = "flowai-commit-basic";
  name = "Basic Feature Commit";
  skill = "flowai-commit";

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Exclude IDE config dirs from git
    await Deno.writeTextFile(
      join(sandboxPath, ".gitignore"),
      ".claude/\n.cursor/\n",
    );

    // Initial commit with README, AGENTS.md and .gitignore
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md", ".gitignore"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is already in sandbox but NOT in git yet.
    // This makes it an untracked file, which is what the scenario expects.
  }

  userQuery =
    "/flowai-commit I added a sum function in utils.ts. Commit this changes.";

  checklist = [
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "commit_message_match",
      description: "Does the commit message describe sum function?",
      critical: false,
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
