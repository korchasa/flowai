import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const CommitDynamicDocListBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-commit-dynamic-doc-list";
  name = "Dynamic Document List from Hierarchy";
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
      "Agent discovers api-reference.md from AGENTS.md Documentation Hierarchy and updates it with new API info",
  };

  override async setup(sandboxPath: string) {
    // Inject a custom Documentation Hierarchy into root AGENTS.md that includes
    // api-reference.md — the agent must discover it dynamically.
    const agentsPath = join(sandboxPath, "AGENTS.md");
    let content = await Deno.readTextFile(agentsPath);
    content = content.replace(
      /## Documentation Hierarchy\n[\s\S]*?(?=\n## )/,
      `## Documentation Hierarchy
1. **\`AGENTS.md\`**: Project vision, constraints, mandatory rules. READ-ONLY reference.
2. **SRS** (\`documents/requirements.md\`): "What" & "Why". Source of truth for requirements.
3. **SDS** (\`documents/design.md\`): "How". Architecture and implementation. Depends on SRS.
4. **API Reference** (\`documents/api-reference.md\`): API endpoints, request/response formats, authentication.
5. **Tasks** (\`documents/tasks/<YYYY-MM-DD>-<slug>.md\`): Temporary plans/notes per task.
6. **\`README.md\`**: Public-facing overview.

`,
    );
    await Deno.writeTextFile(agentsPath, content);

    // Create api.ts as untracked — contains new API endpoint code.
    const apiCode = `export function getUsers() {
  return [{ id: 1, name: "Alice" }];
}

export function getUserById(id: number) {
  return { id, name: "Alice" };
}
`;
    await Deno.writeTextFile(join(sandboxPath, "api.ts"), apiCode);
  }

  userQuery =
    "/flowai-commit Added API functions getUsers and getUserById in api.ts. Commit the changes.";

  checklist = [
    {
      id: "custom_doc_discovered",
      description:
        "Did the agent discover `api-reference.md` from root `AGENTS.md` Documentation Hierarchy section? Evidence: agent read AGENTS.md and mentioned api-reference.md in its audit process.",
      critical: true,
    },
    {
      id: "custom_doc_updated",
      description:
        "Did the agent update `documents/api-reference.md` with information about the new API functions (getUsers, getUserById)? Check the file contents.",
      critical: true,
    },
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
  ];
}();
