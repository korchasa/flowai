import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";

export const CommitCheckBench = new class extends BenchmarkSkillScenario {
  id = "flow-commit-check";
  name = "Pre-flight Check";
  skill = "flow-commit";

  async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Exclude IDE config dirs from git
    await Deno.writeTextFile(
      join(sandboxPath, ".gitignore"),
      ".claude/\n.cursor/\n",
    );

    // Initial commit with all files
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(
      new URL("file.ts", `file://${sandboxPath}/`).pathname,
      "const x = 2;",
    );
  }

  userQuery = "/flow-commit Commit changes in file.ts.";

  checklist = [
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
  ];
}();
