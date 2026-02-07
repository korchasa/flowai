import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import { runGit, setupGitRepo } from "../../../../scripts/benchmarks/lib/utils.ts";
import { join } from "@std/path";

export const CommitDepsBench = new class extends BenchmarkSkillScenario {
  id = "af-commit-deps";
  name = "Atomic Split: Deps vs Logic";
  skill = "af-commit";

  async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit
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
  }

  userQuery =
    "/af-commit Commit changes. I updated the version in deno.json and the logic in mod.ts. Split them.";

  checklist = [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "build_commit",
      description:
        "Is there a commit with type 'build' for json change?",
      critical: true,
    },
    {
      id: "feat_fix_commit",
      description: "Is there a commit with type 'feat' or 'fix' for logic?",
      critical: true,
    },
  ];
}();
