import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitWhiteboardContextBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-whiteboard-context";
  name = "Whiteboard Context in Documentation Audit";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    generateDocuments: true,
  };

  override sandboxState = {
    commits: [],
    modified: [] as string[],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent uses whiteboard context to understand the /users endpoint purpose and updates documentation accordingly",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything (including whiteboard) as "init".
    // Create api.ts as a new untracked file — the diff alone shows code but
    // doesn't explain WHY (the whiteboard has the context about /users endpoint).
    const apiCode = `export function handleUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}
`;
    await Deno.writeTextFile(join(sandboxPath, "api.ts"), apiCode);
  }

  // User references the whiteboard — agent should read it for context
  userQuery =
    "/flowai-commit Implemented the /users endpoint as planned in the whiteboard documents/whiteboards/2026-03-28-add-users-api.md. Commit the changes.";

  checklist = [
    {
      id: "docs_reflect_whiteboard",
      description:
        "Did the agent update documentation (requirements.md or design.md) with information derived from the whiteboard context — specifically mentioning the /users endpoint, user API, or user management? The key test: the diff of api.ts alone doesn't explain the business requirement — only the whiteboard does.",
      critical: true,
    },
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
  ];
}();
