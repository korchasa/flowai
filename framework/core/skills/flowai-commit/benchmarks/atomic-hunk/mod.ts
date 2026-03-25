import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../../scripts/benchmarks/lib/utils.ts";
import { join } from "@std/path";

export const CommitAtomicHunkBench = new class extends BenchmarkSkillScenario {
  id = "flowai-commit-atomic-hunk";
  name = "Atomic Split: Hunk (Style vs Logic)";
  skill = "flowai-commit";
  stepTimeoutMs = 120_000;

  async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Logic (rename function)
    // Change 2: Style (add spaces)
    await Deno.writeTextFile(
      join(sandboxPath, "code.ts"),
      "function newName() { return 1; } \n// Added comment for style",
    );
  }

  userQuery =
    "/flowai-commit Commit changes. I renamed a function (logic) and added a comment (style). Split them into two commits (style and refactor).";

  checklist = [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "style_commit",
      description: "Is there a commit with type 'style'?",
      critical: true,
    },
    {
      id: "refactor_commit",
      description: "Is there a commit with type 'refactor'?",
      critical: true,
    },
  ];
}();
