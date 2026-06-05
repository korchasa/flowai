import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * FR-AI-CODE-REVIEW + FR-DIFF-OPTIONAL. The AI owns code review. Its
 * human-facing output is a DECISION-LEVEL verdict (task complete? design
 * sound? key risks?) that the human can act on WITHOUT reading the diff
 * line-by-line, and diff inspection is offered as OPTIONAL and non-blocking
 * (Model B). Both FRs share this one verdict-not-diff-walk execution path, so
 * per AGENTS.md "grep before near-duplicate" they collapse to one scenario.
 */
export const ReviewDecisionLevelVerdict = new class
  extends AcceptanceTestScenario {
  id = "review-decision-level-verdict";
  name = "Review reports a decision-level verdict; diff inspection optional";
  skill = "review";
  maxSteps = 15;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Money",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove money.ts from tracking",
      files: ["money.ts"],
    }],
    untracked: ["money.ts"],
    expectedOutcome:
      "Agent reviews untracked money.ts and reports a decision-level verdict with optional diff",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed all files (including money.ts) as "init".
    // Remove money.ts from index to make it untracked, keeping the working copy.
    await runGit(sandboxPath, ["rm", "--cached", "money.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove money.ts from tracking",
    ]);
    // money.ts is clean, correct, and well-typed — the verdict should be Approve.
  }

  userQuery = "/review Review the new money formatting helper";

  userPersona =
    `You are a developer who does NOT read code and will NOT open the diff yourself — you decide whether to ship based entirely on the agent's verdict.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown the verdict, acknowledge it. Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "diff_explicitly_optional",
      description:
        "Does the agent EXPLICITLY communicate that the human reading the diff/code is OPTIONAL — e.g. it offers the diff/details for optional inspection and states (or clearly conveys) that the verdict can be accepted WITHOUT reading the code (Model B)? A report that simply ends with findings and never frames diff-reading as optional does NOT satisfy this — the optionality must be offered, not merely implied by the agent not blocking.",
      critical: true,
    },
    {
      id: "verdict_for_non_coder",
      description:
        "Does the report LEAD with a plain-language, decision-level verdict a non-coder can act on — explicitly stating whether the task/requirement is complete, whether the design/structure is sound, and the key risks (if any) in prose — rather than presenting the outcome primarily as a list of file:line code findings the human must interpret?",
      critical: true,
    },
    {
      id: "verdict_emitted",
      description:
        "Did the agent emit a clear verdict label (Approve / Request Changes / Needs Discussion)?",
      critical: true,
    },
    {
      id: "no_commit",
      description: "The agent did NOT commit any changes (review only)?",
      critical: true,
    },
    {
      id: "ai_did_the_review",
      description:
        "Did the AI itself perform the code review (collect the diff/changes and assess QA + code quality), rather than asking the human to do it?",
      critical: false,
    },
  ];
}();
