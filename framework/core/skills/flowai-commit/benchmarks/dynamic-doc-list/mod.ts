import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitDynamicDocListBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-dynamic-doc-list";
  name = "Dynamic Document List from Hierarchy";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    // NOTE: generateDocuments is false — we provide a custom documents/AGENTS.md
    // with an extra document (api-reference.md) in the Hierarchy.
  };

  override sandboxState = {
    commits: [],
    untracked: ["api.ts"],
    expectedOutcome:
      "Agent discovers api-reference.md from documents/AGENTS.md Hierarchy and updates it with new API info",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything (including custom documents/AGENTS.md
    // with api-reference.md in Hierarchy) as "init".
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
        "Did the agent discover `api-reference.md` from `documents/AGENTS.md` Hierarchy section? Evidence: agent read documents/AGENTS.md and mentioned api-reference.md in its audit process.",
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
    {
      id: "audit_report_dynamic",
      description:
        "Does the documentation audit report include a line for `api-reference.md` (not just the default 3 files)?",
      critical: false,
    },
  ];
}();
