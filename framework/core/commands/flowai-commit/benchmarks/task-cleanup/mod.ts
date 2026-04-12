import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitTaskCleanupBench = new class extends BenchmarkSkillScenario {
  id = "flowai-commit-task-cleanup";
  name = "Task file deleted after commit when work followed a task file";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent commits api.ts and deletes the referenced task file (documents/tasks/2026-03-28-add-users-api.md) as part of the commit, since the planned work is complete",
  };

  override async setup(sandboxPath: string) {
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

  checklist = [
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
    {
      id: "task_file_deleted",
      description:
        "Was the task file (documents/tasks/2026-03-28-add-users-api.md) deleted (via git rm or rm + git add) and included in the commit? The file should not exist on disk after the commit.",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
