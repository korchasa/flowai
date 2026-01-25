import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitSyncDocsBench: BenchmarkScenario = {
  id: "af-commit-sync-docs",
  name: "Workspace Sync: Docs Update",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "documents/README.md"),
      "# Docs\nOld content",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "src.ts"),
      "console.log('old');",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change source code
    await Deno.writeTextFile(
      join(sandboxPath, "src.ts"),
      "console.log('new feature');",
    );
  },

  userQuery:
    "I added a new feature in src.ts. Commit changes, but first update the documentation in documents/README.md to reflect the changes.",

  checklist: [
    {
      id: "docs_updated",
      description: "Did the agent update 'documents/README.md'?",
      critical: true,
    },
    {
      id: "docs_committed",
      description: "Is the documentation change included in a commit?",
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
