import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";

export const CommitSuggestReflectBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-commit-suggest-reflect";
  name = "Suggest /flow-reflect after error-prone session";
  skill = "flow-commit";

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    await Deno.writeTextFile(
      join(sandboxPath, ".gitignore"),
      ".claude/\n.cursor/\n",
    );

    await runGit(sandboxPath, [
      "add",
      "README.md",
      "utils.ts",
      ".gitignore",
    ]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Modify utils.ts — simulates a fix after errors
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      [
        "export function parse(input: string): number {",
        "  const result = Number(input);",
        "  if (isNaN(result)) throw new Error(`Invalid number: ${input}`);",
        "  return result;",
        "}",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "/flow-commit I had to fix the parse function after several failed attempts — parseInt was silently returning NaN. The new version throws on invalid input. Commit this fix.";

  checklist = [
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description: "Does the commit message follow Conventional Commits?",
      critical: true,
    },
    {
      id: "suggest_reflect",
      description:
        "Does the agent suggest running `/flow-reflect` (or mention reflect) after committing, based on the session having errors/retries/workarounds?",
      critical: true,
    },
  ];
}();
