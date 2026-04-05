import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitWhiteboardCleanupPartialBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-whiteboard-cleanup-partial";
  name =
    "Whiteboard NOT deleted when DoD is partially complete — agent asks user";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  interactive = true;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    generateDocuments: true,
  };

  override sandboxState = {
    commits: [],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent detects the whiteboard DoD is NOT fully complete (POST /users is missing from the code), asks the user whether to delete the whiteboard, and does NOT auto-delete it",
  };

  override async setup(sandboxPath: string) {
    // Code only implements GET, but whiteboard DoD requires both GET and POST
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
    "/flowai-commit Implemented the /users endpoint as planned in the whiteboard documents/whiteboards/2026-03-28-add-users-api.md. Commit the changes.";

  userPersona =
    `You are a developer who partially implemented a whiteboard plan.
When the agent asks about the whiteboard or incomplete items, say you want to keep the whiteboard for now since POST is not done yet.
Keep answers brief.`;

  checklist = [
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
    {
      id: "whiteboard_not_deleted",
      description:
        "Is the whiteboard file (documents/whiteboards/2026-03-28-add-users-api.md) still present on disk after the commit? The agent must NOT auto-delete it when DoD is incomplete.",
      critical: true,
    },
    {
      id: "asked_user_about_whiteboard",
      description:
        "Did the agent ask the user whether to delete or keep the whiteboard, mentioning that the plan is not fully complete (POST /users missing)?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
