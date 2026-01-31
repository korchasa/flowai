import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";

const AGENT_PATH = "catalog/skills/af-commit/SKILL.md";

export const CommitCheckFailBench: BenchmarkScenario = {
  id: "af-commit-check-fail",
  name: "Pre-flight Check Failure",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(
      new URL("file.ts", `file://${sandboxPath}/`).pathname,
      "const x = 2;",
    );
  },

  userQuery: "/af-commit Commit changes.",

  checklist: [
    {
      id: "check_executed",
      description: "Did the agent run 'deno task check'?",
      critical: true,
    },
    {
      id: "no_commit_on_fail",
      description: "Did the agent ABORT the commit process (no new commits)?",
      critical: true,
    },
  ],
};
