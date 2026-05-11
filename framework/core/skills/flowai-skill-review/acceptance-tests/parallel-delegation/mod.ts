import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const ParallelDelegationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-review-parallel-delegation";
  name = "Review delegates checks in parallel for large diffs";
  skill = "flowai-skill-review";
  maxSteps = 20;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "DataProcessor",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove processor.ts from tracking",
      files: ["processor.ts"],
    }],
    untracked: ["processor.ts"],
    expectedOutcome:
      "Agent reviews a large diff (>50 lines), delegates automated checks and hygiene scan to parallel agents, and includes their findings in the report",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed all files (including processor.ts) as "init".
    // Remove processor.ts from index to make it untracked, keeping the working copy.
    await runGit(sandboxPath, ["rm", "--cached", "processor.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove processor.ts from tracking",
    ]);

    // processor.ts is >50 lines — triggers parallel delegation path
  }

  userQuery =
    "/flowai-skill-review Review the data processor implementation (processor.ts)";

  userPersona =
    `You are a developer who submitted a large data processor for review.
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
      id: "parallel_delegation",
      description:
        "Did the agent delegate automated checks or hygiene scan to a background agent/task (e.g., launched a subagent, background task, or parallel execution) instead of running everything sequentially in the main thread?",
      critical: true,
    },
    {
      id: "automated_checks_in_report",
      description:
        "Does the final report include an 'Automated Checks' section with pass/fail results (from delegation or inline execution)?",
      critical: true,
    },
    {
      id: "hygiene_in_report",
      description:
        "Does the final report include hygiene findings (TODO, FIXME, debug statements, temp files) — either from delegated scan or inline check?",
      critical: false,
    },
    {
      id: "review_executed",
      description:
        "Did the agent perform both QA and code review checks on the diff?",
      critical: true,
    },
    {
      id: "verdict_present",
      description:
        "Did the review produce a verdict (Approve, Request Changes, or Needs Discussion)?",
      critical: true,
    },
    {
      id: "no_commit",
      description:
        "The agent did NOT commit any changes (review only, not commit)?",
      critical: true,
    },
  ];
}();
