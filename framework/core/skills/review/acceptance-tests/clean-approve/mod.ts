import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const CleanApproveBench = new class extends AcceptanceTestScenario {
  id = "review-clean-approve";
  name = "Review approves clean changes";
  skill = "review";
  maxSteps = 15;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "StringUtils",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  // The fixture gained `strings_test.ts` and a `deno.json` on 2026-08-24. It
  // shipped a new exported function with no test at all, and `review`'s own
  // testing gate calls that a [critical] finding that forbids Approve — so the
  // scenario asked the skill to approve a change its rules require it to reject,
  // and only passed on runs that happened to skip the gate. Measured 1/3 with
  // `Request Changes` naming "zero test coverage for capitalize" in both
  // failures. Clean now means clean by the reviewer's own standard: the test
  // ships with the change, and the manifest lets the check command be detected.
  override sandboxState = {
    commits: [{
      message: "Remove strings.ts from tracking",
      files: ["strings.ts", "strings_test.ts"],
    }],
    untracked: ["strings.ts", "strings_test.ts"],
    expectedOutcome:
      "Agent reviews untracked strings.ts and approves clean code",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed all files (including strings.ts) as "init".
    // Remove the change set from the index to make it untracked, keeping the
    // working copies. The test goes with it: a review of the function without
    // its test is a review of an incomplete change.
    await runGit(sandboxPath, [
      "rm",
      "--cached",
      "strings.ts",
      "strings_test.ts",
    ]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove strings.ts from tracking",
    ]);

    // Both files are now untracked — the agent should review them
  }

  userQuery = "/review Review the added capitalize function";

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
    {
      id: "severity_tags",
      description:
        "Are findings tagged with severity levels like [critical], [warning], or [nit]?",
      critical: false,
    },
    {
      id: "verdict_first_line",
      description:
        "Is the verdict (Approve/Request Changes/Needs Discussion) on the first line of the report?",
      critical: false,
    },
  ];
}();
