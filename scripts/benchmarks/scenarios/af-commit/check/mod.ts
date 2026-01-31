import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";

const AGENT_PATH = "catalog/skills/af-commit/SKILL.md";

export const CommitCheckBench: BenchmarkScenario = {
  id: "af-commit-check",
  name: "Pre-flight Check",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);

    // Initial commit with all files
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(
      new URL("file.ts", `file://${sandboxPath}/`).pathname,
      "const x = 2;",
    );
  },

  userQuery: "/af-commit Commit changes in file.ts.",

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
