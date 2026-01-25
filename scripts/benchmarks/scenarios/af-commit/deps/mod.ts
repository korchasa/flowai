import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitDepsBench: BenchmarkScenario = {
  id: "af-commit-deps",
  name: "Atomic Split: Deps vs Logic",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "version": "1.0.0" }`,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "mod.ts"),
      "export const v = 1;",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Bump version
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "version": "1.1.0" }`,
    );
    // Change 2: Logic
    await Deno.writeTextFile(
      join(sandboxPath, "mod.ts"),
      "export const v = 2;",
    );
  },

  userQuery:
    "Commit changes. I updated the version in deno.json and the logic in mod.ts. Split them.",

  checklist: [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "chore_commit",
      description:
        "Is there a commit with type 'chore' or 'build' for json change?",
      critical: true,
    },
    {
      id: "feat_fix_commit",
      description: "Is there a commit with type 'feat' or 'fix' for logic?",
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
