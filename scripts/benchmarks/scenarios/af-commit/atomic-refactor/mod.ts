import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";
import { join } from "@std/path";

const AGENT_PATH = "catalog/skills/af-commit/SKILL.md";

export const CommitAtomicRefactorBench: BenchmarkScenario = {
  id: "af-commit-atomic-refactor",
  name: "Atomic Split: Refactor vs Feature",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // File 1: Refactor
    await Deno.writeTextFile(
      join(sandboxPath, "math.ts"),
      "export const add = (a, b) => a + b; // Renamed from sum",
    );

    // File 2: New Feature
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const log = (msg) => console.log(msg);",
    );
  },

  userQuery:
    "/af-commit Commit changes. I renamed a function in math.ts (refactoring) and added utils.ts (new feature). Separate refactoring from the new feature.",

  checklist: [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "refactor_commit",
      description: "Is there a commit with type 'refactor'?",
      critical: true,
    },
    {
      id: "feat_commit",
      description: "Is there a commit with type 'feat'?",
      critical: true,
    },
  ],
};
