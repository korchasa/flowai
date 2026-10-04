import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-TASK-LIFECYCLE: superseded tasks are provenance records.
// Their stale DoD no longer maps to current reality, so commit must preserve
// `status: superseded` and `superseded_by` instead of deriving a new status.
export const CommitPreservesSupersededTaskStatusBench = new class
  extends AcceptanceTestScenario {
  id = "commit-preserves-superseded-task-status";
  name = "Task lifecycle preserves superseded task status";
  skill = "commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: ["src/auth/session_refresh.ts"],
    expectedOutcome:
      "Agent commits the new source file while preserving `documents/tasks/2026/05/old-auth-refresh.md` frontmatter exactly as `status: superseded` with `superseded_by: 2026/05/session-auth-refresh.md`. The stale DoD has 1 of 2 items checked and must NOT be used to rewrite the superseded task to `in progress`.",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "src/auth"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src/auth/session_refresh.ts"),
      `export function refreshSession(token: string) {
  if (!token) throw new Error("token required");
  return { token, refreshed: true };
}
`,
    );
  }

  userQuery =
    "/commit Implemented the replacement auth refresh helper. The old task at documents/tasks/2026/05/old-auth-refresh.md is already superseded by documents/tasks/2026/05/session-auth-refresh.md. Commit the source change without reopening or reclassifying the old task.";

  checklist = [
    {
      id: "code_committed",
      description: "Is `src/auth/session_refresh.ts` present in a commit?",
      critical: true,
    },
    {
      id: "superseded_status_preserved",
      description:
        "Read `documents/tasks/2026/05/old-auth-refresh.md` after the commit. Does its frontmatter still contain `status: superseded` (NOT `status: in progress`, `status: to do`, or `status: done`)?",
      critical: true,
    },
    {
      id: "superseded_by_preserved",
      description:
        "Does the same task frontmatter still contain `superseded_by: 2026/05/session-auth-refresh.md`?",
      critical: true,
    },
    {
      id: "no_task_status_diff_committed",
      description:
        "Run `git log -p -- documents/tasks/2026/05/old-auth-refresh.md`. Is there no commit in the agent's session that changes the task's `status:` line?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final `git status` clean?",
      critical: true,
    },
  ];
}();
