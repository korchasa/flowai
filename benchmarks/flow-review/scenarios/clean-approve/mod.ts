import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../scripts/benchmarks/lib/utils.ts";

export const CleanApproveBench = new class extends BenchmarkSkillScenario {
  id = "flow-review-clean-approve";
  name = "Review approves clean changes";
  skill = "flow-review";
  maxSteps = 15;
  stepTimeoutMs = 180_000;
  interactive = true;

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

    // Initial commit with README and AGENTS.md
    await runGit(sandboxPath, ["add", "README.md", "AGENTS.md"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // strings.ts is untracked — the agent should review it
  }

  userQuery = "/flow-review Review the added capitalize function";

  userPersona = `You are a developer who submitted clean code for review.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, acknowledge them.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "diff_collected",
      description:
        "Did the agent collect git diff or git status to identify the changes?",
      critical: true,
    },
    {
      id: "review_executed",
      description:
        "Did the agent perform both QA and code review checks on the diff?",
      critical: true,
    },
    {
      id: "verdict_approve",
      description:
        "Did the review verdict indicate Approve (no critical issues)?",
      critical: true,
    },
    {
      id: "structured_report",
      description:
        "Did the agent output a structured report with findings sections and summary?",
      critical: false,
    },
    {
      id: "no_commit",
      description:
        "The agent did NOT commit any changes (review only, not commit)?",
      critical: true,
    },
  ];
}();
