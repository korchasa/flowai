import { BenchmarkScenario } from "../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitBasicBench: BenchmarkScenario = {
  id: "af-commit-basic",
  name: "Basic Feature Commit",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    // Create initial file
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Test Project");
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Create the "change"
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const add = (a: number, b: number) => a + b; // New feature",
    );
  },

  userQuery:
    "I added a sum function in utils.ts. Commit this with the message 'add sum function'.",

  checklist: [
    {
      id: "git_status_checked",
      description:
        "Did the agent run 'git status' or 'git diff' to check state?",
      critical: false,
    },
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "commit_message_match",
      description: "Does the commit message contain 'add sum function'?",
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
