import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";
import { join } from "@std/path";

export const CommitAtomicDocsBench = new class extends BenchmarkSkillScenario {
  id = "flow-commit-atomic-docs";
  name = "Atomic Split: Docs vs Code";
  skill = "flow-commit";
  stepTimeoutMs = 120_000;

  async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Docs
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# New Title");
    // Change 2: Code
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "console.log('hello');",
    );
  }

  userQuery =
    "/flow-commit Commit changes. I updated README.md (docs) and main.ts (code). Split documentation and code.";

  checklist = [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "docs_commit",
      description: "Is there a commit with type 'docs'?",
      critical: true,
    },
    {
      id: "feat_fix_commit",
      description: "Is there a commit with type 'feat', 'fix', or 'refactor'?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
