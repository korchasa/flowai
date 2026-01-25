import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitCheckBench: BenchmarkScenario = {
  id: "af-commit-check",
  name: "Pre-flight Check",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "tasks": { "check": "echo 'checking...'" } }`,
    );
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 1;");
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 2;");
  },

  userQuery: "Commit changes in file.ts.",

  checklist: [
    {
      id: "check_executed",
      description: "Did the agent run 'deno task check'?",
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
