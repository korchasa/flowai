import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitTaskCleanupPartialBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-task-cleanup-partial";
  name =
    "Task file NOT deleted when DoD is partially complete — agent asks user";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  interactive = true;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent detects the task file DoD is NOT fully complete (POST /users is missing from the code), asks the user whether to delete the task file, and does NOT auto-delete it",
  };

  override async setup(sandboxPath: string) {
    // Code only implements GET, but task file DoD requires both GET and POST
    const apiCode = `export function handleUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}
`;
    await Deno.writeTextFile(join(sandboxPath, "api.ts"), apiCode);
  }

  userQuery =
    "/flowai-commit Implemented the /users endpoint as planned in the task file documents/tasks/2026-03-28-add-users-api.md. Commit the changes.";

  userPersona = `You are a developer who partially implemented a task file plan.
When the agent asks about the task file or incomplete items, say you want to keep the task file for now since POST is not done yet.
Keep answers brief.`;

  checklist = [
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
    {
      id: "task_file_not_deleted",
      description:
        "Is the task file (documents/tasks/2026-03-28-add-users-api.md) still present on disk after the commit? The agent must NOT auto-delete it when DoD is incomplete.",
      critical: true,
    },
    {
      id: "asked_user_about_task_file",
      description:
        "Did the agent ask the user whether to delete or keep the task file, mentioning that the plan is not fully complete (POST /users missing)?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
