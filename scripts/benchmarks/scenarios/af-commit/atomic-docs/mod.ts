import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitAtomicDocsBench: BenchmarkScenario = {
  id: "af-commit-atomic-docs",
  name: "Atomic Split: Docs vs Code",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Old Title");
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "console.log('hi');",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Docs
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# New Title");
    // Change 2: Code
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "console.log('hello');",
    );
  },

  userQuery:
    "Commit changes. I updated README.md (docs) and main.ts (code). Split documentation and code.",

  checklist: [
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
