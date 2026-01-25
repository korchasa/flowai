import { BenchmarkScenario } from "../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitAtomicHunkBench: BenchmarkScenario = {
  id: "af-commit-atomic-hunk",
  name: "Atomic Split: Hunk (Style vs Logic)",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "code.ts"),
      "function old(){ return 1; }",
    );
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
    "Commit changes. I renamed a function (logic) and added a comment (style). Split them into two commits (style and refactor).",

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

// --- Helpers ---

async function setupGitRepo(path: string) {
  await runGit(path, ["init"]);
  await runGit(path, ["config", "user.name", "Benchmark Bot"]);
  await runGit(path, ["config", "user.email", "bot@example.com"]);
}

async function runGit(cwd: string, args: string[]) {
  const cmd = new Deno.Command("git", {
    args,
    cwd,
    stdout: "null",
    stderr: "null",
  });
  await cmd.output();
}
