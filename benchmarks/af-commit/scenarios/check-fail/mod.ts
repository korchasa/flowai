import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const CommitCheckFailBench = new class extends BenchmarkSkillScenario {
  id = "af-commit-check-fail";
  name = "Pre-flight Check Failure";
  skill = "af-commit";

  async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(
      new URL("file.ts", `file://${sandboxPath}/`).pathname,
      "const x = 2;",
    );
  }

  userQuery = "/af-commit Commit changes.";

  checklist = [
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
  ];
}();
