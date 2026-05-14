import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Verifies the promoted streamlined behavior: Post-Reflect Cleanup Commit (SKILL.md
// step 7). When auto-invoked /flowai-reflect leaves working-tree edits,
// the workflow MUST stage and commit them as a SEPARATE
// `agent: apply reflect-suggested improvements` commit (or narrower scope)
// before exiting — never amend the user's commit, never leave the tree dirty.
// Conditional: if reflect produces no edits, step 7 is skipped and the tree
// must still be clean.
export const ReviewAndCommitPostReflectCleanupCommitBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-review-and-commit-post-reflect-cleanup-commit";
  name = "Post-reflect edits land as separate cleanup commit";
  skill = "flowai-review-and-commit";
  maxSteps = 35;
  stepTimeoutMs = 480_000;
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
      "Agent reviews, approves, commits utils.ts, auto-invokes /flowai-reflect; if reflect produces edits, those edits are committed as a SEPARATE `agent: apply reflect-suggested improvements` commit (not amended into the user commit). Final git status MUST be clean.",
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
      id: "user_change_committed",
      description:
        "Is `utils.ts` present in a commit (the user-requested change)?",
      critical: true,
    },
    {
      id: "reflect_executed",
      description:
        "Did the agent actually start the /flowai-reflect workflow (not merely suggest it as text)? The trace should show reflect-related actions: creating a reflection plan, analyzing the session, listing findings or proposed improvements.",
      critical: true,
    },
    {
      id: "cleanup_commit_correct",
      description:
        "If reflect produced working-tree edits (visible via `git status` after reflect ran), did the agent stage and commit them as a SEPARATE commit whose message starts with `agent:` (e.g., `agent: apply reflect-suggested improvements` or a narrower-scope variant like `agent(flowai-review-and-commit): ...`)? The cleanup commit MUST NOT be an amend of the user-change commit. If reflect produced NO edits, step 7 is correctly skipped and this item passes vacuously.",
      critical: true,
    },
    {
      id: "no_amend_of_user_commit",
      description:
        "Did the agent AVOID amending the user-change commit (the one containing `utils.ts`) with reflect-driven edits? Inspect `git log` and any `git commit --amend` invocations in the trace.",
      critical: true,
    },
    {
      id: "clean_status",
      description:
        "Is the final git status clean (no untracked or modified files), per SKILL.md step 8 'Verify Clean State'?",
      critical: true,
    },
  ];
}();
