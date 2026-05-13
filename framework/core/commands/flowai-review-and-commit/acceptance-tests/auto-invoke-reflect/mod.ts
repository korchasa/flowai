import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const ReviewAndCommitAutoInvokeReflectBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-review-and-commit-auto-invoke-reflect";
  name =
    "Auto-invoke /flowai-skill-reflect after complex review+commit session";
  skill = "flowai-review-and-commit";
  maxSteps = 30;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews untracked utils.ts, approves, commits, detects session complexity, and auto-invokes /flowai-skill-reflect (actually executes the reflect workflow)",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed all files (including utils.ts) as "init".
    // Remove utils.ts from index to make it untracked, keeping the working copy.
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
  }

  userQuery =
    "This session was rough — I hit several errors, had to retry tests multiple times, and you suggested a wrong approach twice before I corrected you. Now the code is ready. /flowai-review-and-commit Review and commit the new utility functions.";

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
      id: "reflect_auto_invoked",
      description:
        "At any point during the workflow (before or after the commit), did the agent AUTO-INVOKE /flowai-skill-reflect — meaning it actually started executing the reflect workflow (creating a reflection plan, analyzing the session for behavioral/technical/context issues, listing concrete findings or proposed improvements)? Merely printing a one-line suggestion like 'Consider running /flowai-skill-reflect' is NOT sufficient — the agent must have actually run the reflect workflow.",
      critical: true,
    },
    {
      id: "reflect_not_asking_permission",
      description:
        "Did the agent proceed autonomously (without asking the user 'should I run /flowai-skill-reflect?' or waiting for confirmation) once it detected session-complexity signals?",
      critical: false,
    },
  ];
}();
