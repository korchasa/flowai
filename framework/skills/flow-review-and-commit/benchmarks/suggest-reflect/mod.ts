import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";

export const SuggestReflectBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-and-commit-suggest-reflect";
  name = "Suggest Reflect After Complex Session";
  skill = "flow-review-and-commit";
  maxSteps = 25;
  stepTimeoutMs = 180_000;
  interactive = true;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    await Deno.writeTextFile(
      join(sandboxPath, ".gitignore"),
      ".claude/\n.cursor/\n",
    );

    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md", ".gitignore"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // utils.ts is untracked — agent will review and commit it
  }

  userQuery =
    "This session was rough — I hit several errors, had to retry tests multiple times, and you suggested a wrong approach that I had to correct. Now the code is ready. /flow-review-and-commit Review and commit the new utility functions.";

  userPersona =
    `You are a developer who had a difficult session with many errors and retries before reaching this point.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If the agent asks about the session difficulties, confirm that there were errors, retries, and corrections.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes?",
      critical: true,
    },
    {
      id: "review_approved",
      description:
        "Did the review verdict indicate Approve (no critical issues)?",
      critical: true,
    },
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "suggest_reflect",
      description:
        "Did the agent suggest running `/flow-reflect` (or mention flow-reflect) after committing, citing session complexity signals like errors, retries, or user corrections?",
      critical: true,
    },
  ];
}();
