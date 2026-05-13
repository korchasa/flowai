import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Verifies the promoted streamlined behavior: Phase 2 reuses the diff already in
// context from Phase 1 instead of re-reading it. Stable
// flowai-review-and-commit MUST NOT re-run `git diff` at the top of Phase 2
// (SKILL.md "Verify Unchanged State": "The diff and file list are
// already in context from Phase 1. Do NOT re-read them.").
export const ReviewAndCommitPhase2DiffEliminatedBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-review-and-commit-phase-2-diff-eliminated";
  name = "Phase 2 reuses Phase 1 diff (no re-read)";
  skill = "flowai-review-and-commit";
  maxSteps = 25;
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
      "Agent runs Phase 1 (review with full diff read), approves, transitions to Phase 2 and commits without re-running `git diff` / `git diff --cached` / `git diff --stat`.",
  };

  override async setup(sandboxPath: string) {
    await runGit(sandboxPath, ["rm", "--cached", "utils.ts"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Remove utils.ts from tracking",
    ]);
  }

  userQuery =
    "/flowai-review-and-commit Review and commit the added utility functions.";

  userPersona =
    `You are a developer who submitted clean code for review and commit.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When shown review results, approve them. When asked to confirm commit, approve.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "review_executed",
      description: "Did the agent perform a review of the changes in Phase 1?",
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
      id: "phase2_skips_diff_reread",
      description:
        "After the review verdict (start of Phase 2), did the agent AVOID running `git diff`, `git diff --cached`, or `git diff --stat` again? Phase 2 MUST reuse the diff already in context from Phase 1. Inspect the trace: count git diff invocations after the review verdict was emitted. Pass = 0 such invocations. `git status -s` and `git log` are allowed; only `git diff*` calls are forbidden.",
      critical: true,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked or modified files)?",
      critical: true,
    },
  ];
}();
