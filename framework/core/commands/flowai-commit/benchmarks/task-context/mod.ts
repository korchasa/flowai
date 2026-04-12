import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitTaskContextBench = new class extends BenchmarkSkillScenario {
  id = "flowai-commit-task-context";
  name = "Task File Context in Documentation Audit";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: [] as string[],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent uses task file context to understand the /users endpoint purpose and updates documentation accordingly",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything (including task file) as "init".
    // Create api.ts as a new untracked file — the diff alone shows code but
    // doesn't explain WHY (the task file has the context about /users endpoint).
    const apiCode = `export function handleUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}
`;
    await Deno.writeTextFile(join(sandboxPath, "api.ts"), apiCode);
  }

  // User references the task file — agent should read it for context
  userQuery =
    "/flowai-commit Implemented the /users endpoint as planned in the task file documents/tasks/2026-03-28-add-users-api.md. Commit the changes.";

  checklist = [
    {
      id: "docs_reflect_task_file",
      description:
        "Did the agent update documentation (requirements.md or design.md) with information derived from the task file context — specifically mentioning the /users endpoint, user API, or user management? The key test: the diff of api.ts alone doesn't explain the business requirement — only the task file does.",
      critical: true,
    },
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
  ];
}();
