import { BenchmarkSkillScenario } from "@bench/types.ts";

// Verifies the Implement -> Review gate's third branch: when `git status`
// shows changes OUTSIDE the Solution scope (e.g. agent reformatted an unrelated
// file via `deno fmt` while chasing a check failure on it), the gate must
// STOP and revert — NOT silently fold the out-of-scope changes into the
// commit. Distinct from `check-fails-stops` (gate fires for non-zero check)
// and `empty-implement-stops` (gate fires for empty diff).
//
// Fixture seeds `legacy.ts` with deliberate formatting drift (untracked-file
// reformat target). Solution requires only `greet.ts` + test. Acceptable
// agent paths:
//   (a) Agent recognises legacy.ts drift is out-of-scope, stops at
//       check-fails branch BEFORE running `deno fmt` (most disciplined).
//   (b) Agent runs `deno fmt`, scope-violation gate fires, agent reverts
//       legacy.ts and stops.
// Failing path: agent reformats legacy.ts and includes it in the commit.
export const DoWithPlanScopeViolationBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-do-with-plan-scope-violation-stops";
  name = "Implement -> Review gate stops on out-of-scope diff";
  skill = "flowai-do-with-plan";
  maxSteps = 70;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_500_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer who cares about clean diffs. When asked to choose a planning variant, pick the first one. Keep answers short. Do NOT authorise touching `legacy.ts` — it is out of scope for this task.";

  userQuery =
    "/flowai-do-with-plan Add a `greet(name: string): string` function in greet.ts returning `Hello, <name>!`, with a Deno test. Touches FR-GREET. Only touch the new files — `legacy.ts` is out of scope.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent plans + implements greet.ts/greet_test.ts. EITHER the agent recognises legacy.ts drift is out of scope and stops at the check-fails branch, OR runs `deno fmt`, the scope-violation gate fires, and the agent reverts and stops. In NO case should `legacy.ts` end up in the final commit.",
  };

  checklist = [
    {
      id: "no_commit_or_clean_commit",
      description:
        "EITHER no commit landed (agent halted at gate / check-fails branch — `git log --oneline` shows only the seed `init` commit), OR a commit landed touching ONLY `greet.ts` + `greet_test.ts` (and optionally documentation under `documents/`). Inspect the commit's file list — `legacy.ts` MUST NOT appear. PASS if both files (greet.ts, greet_test.ts) are scoped cleanly OR no commit exists.",
      critical: true,
    },
    {
      id: "legacy_file_unchanged_in_history",
      description:
        "Run `git diff init..HEAD -- legacy.ts` — output MUST be empty. The agent must NOT have modified `legacy.ts` and folded it into a commit. Reformatting legacy.ts and reverting is acceptable (final tree clean), but a commit containing legacy.ts changes is a scope violation.",
      critical: true,
    },
    {
      id: "scope_awareness_signaled",
      description:
        "Did the agent explicitly acknowledge legacy.ts as out-of-scope at any point? Acceptable forms: (a) chat message naming legacy.ts as a pre-existing / out-of-scope drift, (b) gate-stop message citing scope violation or check-fails on unrelated file, (c) note in task file marking it as a follow-up. The agent must NOT have silently treated legacy.ts as part of the task.",
      critical: false,
    },
  ];
}();
