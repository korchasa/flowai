import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const ReviewNoGroupingBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-review-no-grouping";
  name =
    "Review must NOT delegate atomic commit grouping (commit's responsibility)";
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
      "Agent reviews a large diff (>50 lines), delegates checks and hygiene, but does NOT delegate or perform atomic commit grouping (SA3/diff-specialist) — that is commit's responsibility",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "processor.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove processor.ts from tracking",
    ]);
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
      id: "no_grouping_delegation",
      description:
        "Did the agent avoid delegating atomic commit grouping to a diff-specialist or similar agent? Review must NOT analyze how to split/group changes into commits — that is commit's responsibility. Check that no subagent was launched for 'commit grouping', 'atomic grouping', or 'diff analysis for commits'.",
      critical: true,
    },
    {
      id: "no_commit_plan",
      description:
        "Did the agent avoid producing a commit plan, commit grouping strategy, or JSON structure with proposed commits? The review output should contain only review findings, not commit recommendations.",
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
