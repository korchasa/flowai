import { BenchmarkScenario } from "../../../lib/types.ts";
import { runGit, setupGitRepo } from "../../../lib/utils.ts";
import { join } from "@std/path";

const AGENT_PATH = "catalog/skills/af-commit/SKILL.md";

export const CommitSyncDocsBench: BenchmarkScenario = {
  id: "af-commit-sync-docs",
  name: "Workspace Sync: Docs Update",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change source code
    await Deno.writeTextFile(
      join(sandboxPath, "src.ts"),
      "console.log('new feature');",
    );
  },

  userQuery:
    "/af-commit I added a new feature in src.ts. Commit changes, but first update the documentation in documents/README.md to reflect the changes.",

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
