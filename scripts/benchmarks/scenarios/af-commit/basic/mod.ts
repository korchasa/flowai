import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";

const AGENT_PATH = ".cursor/skills/af-commit/SKILL.md";

export const CommitBasicBench: BenchmarkScenario = {
  id: "af-commit-basic",
  name: "Basic Feature Commit",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);

    // Initial commit with README and AGENTS.md
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is already in sandbox but NOT in git yet.
    // This makes it an untracked file, which is what the scenario expects.
  },

  userQuery: "I added a sum function in utils.ts. Commit this changes.",

  checklist: [
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "commit_message_match",
      description: "Does the commit message describe sum function?",
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
