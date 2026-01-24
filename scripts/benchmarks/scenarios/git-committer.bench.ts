import { BenchmarkScenario } from "../lib/types.ts";
import { join } from "@std/path";

export const GitCommitterBench: BenchmarkScenario = {
  id: "git-committer-basic",
  name: "Basic Feature Commit",
  targetAgentPath: ".cursor/agents/git-committer.md",

  setup: async (sandboxPath: string) => {
    // Initialize a dummy git repo
    const cmd = new Deno.Command("git", {
      args: ["init"],
      cwd: sandboxPath,
      stdout: "null",
      stderr: "null",
    });
    await cmd.output();

    // Configure dummy user for git
    const configName = new Deno.Command("git", {
      args: ["config", "user.name", "Benchmark Bot"],
      cwd: sandboxPath,
    });
    await configName.output();

    const configEmail = new Deno.Command("git", {
      args: ["config", "user.email", "bot@example.com"],
      cwd: sandboxPath,
    });
    await configEmail.output();

    // Create a file and commit it so we have a HEAD
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Test Project");
    const add = new Deno.Command("git", {
      args: ["add", "."],
      cwd: sandboxPath,
    });
    await add.output();

    const commit = new Deno.Command("git", {
      args: ["commit", "-m", "Initial commit"],
      cwd: sandboxPath,
    });
    await commit.output();

    // Now create the "change" that needs to be committed
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const add = (a: number, b: number) => a + b; // New feature",
    );
  },

  userQuery:
    "Я добавил функцию сложения в utils.ts. Закоммить это с сообщением 'add sum function'.",

  checklist: [
    {
      id: "git_status_checked",
      description:
        "Did the agent run 'git status' to check the state before acting? (Check EXECUTED COMMANDS)",
      critical: false,
    },
    {
      id: "file_committed",
      description:
        "Is `utils.ts` present in the last commit stats? (Check LAST COMMIT evidence)",
      critical: true,
    },
    {
      id: "commit_message_match",
      description:
        "Does the actual commit message contain 'add sum function'? (Check LAST COMMIT evidence)",
      critical: true,
    },
    {
      id: "conventional_commits",
      description:
        "Does the actual commit message follow Conventional Commits (e.g., feat: ...)? (Check LAST COMMIT evidence)",
      critical: false,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked/staged files)? (Check FINAL GIT STATUS evidence)",
      critical: true,
    },
  ],
};
