import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";
import { join } from "@std/path";

const AGENT_PATH = "catalog/skills/af-commit/SKILL.md";

export const CommitAtomicHunkBench: BenchmarkScenario = {
  id: "af-commit-atomic-hunk",
  name: "Atomic Split: Hunk (Style vs Logic)",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
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
  },

  userQuery:
    "/af-commit Commit changes. I renamed a function (logic) and added a comment (style). Split them into two commits (style and refactor).",

  checklist: [
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
  ],
};
