import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Changed 2026-10-04: the session now carries a real error for the reflection
// to quote, as in the sibling `post-reflect-cleanup-commit`. The query used to
// CLAIM a rough session ("I hit several errors… you suggested a wrong approach
// twice") that the run never contained. The reflection is told to drop every
// finding it cannot quote, so it ran, found nothing and said so in one line,
// and the judge failed `reflect_auto_invoked` for want of findings (sweep
// `2026-10-04T17-05-17`, 2 of 3 runs). AGENTS.md now names `deno task verify`,
// a task `deno.json` does not define (it is `check`), and the user names the
// same stale check, so the first check attempt fails with `Task not found`.
// `reflect_auto_invoked` also looked for a separate /reflect workflow, which
// the composite inlines and forbids invoking.
export const ReviewAndCommitAutoInvokeReflectBench = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-auto-invoke-reflect";
  name = "Auto-invoke /reflect after complex review+commit session";
  skill = "review-and-commit";
  maxSteps = 30;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task verify` — the project check: format, lint and all tests.",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Remove utils.ts from tracking",
      files: ["utils.ts"],
    }],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent reviews untracked utils.ts, approves, commits, notices that `deno task verify` failed, and runs the inlined reflection on its own: it names that failure and traces it to the stale line in AGENTS.md.",
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

  // Slash command first — see the sibling `post-reflect-cleanup-commit`
  // scenario: prose ahead of it stops Claude Code from expanding the command.
  userQuery =
    "/review-and-commit Review and commit the new utility functions. The project check is `deno task verify`.";

  userPersona = `You are the developer who wrote the utility functions.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
If asked whether to push a commit made to the instruction files, reply: 'yes'.
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
        "Did the agent carry out the session-reflection step the workflow inlines, on its own (the composite runs it itself and forbids invoking a separate reflect skill, so do NOT look for one)? The trace must show the agent analysing its own session and naming the concrete failure in it — the `deno task verify` call that failed because `deno.json` defines no such task — and tracing it to the instruction that named the command. A one-line conclusion that nothing was found, or an offer to reflect later, does NOT count: this session always contains that failure.",
      critical: true,
    },
    {
      id: "reflect_not_asking_permission",
      description:
        "Did the agent decide to RUN the reflection on its own — never asking 'should I reflect?' and never waiting for permission to start it? The single question it is supposed to ask is a DIFFERENT one, at the END: having applied AND committed its corrective edits to AGENTS.md / CLAUDE.md, it asks whether to PUSH that commit. Asking that one, and waiting for the answer, is correct and must NOT fail this item.",
      critical: false,
    },
  ];
}();
