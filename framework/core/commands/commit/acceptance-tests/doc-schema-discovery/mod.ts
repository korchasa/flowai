import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const CommitDocSchemaDiscoveryBench = new class
  extends AcceptanceTestScenario {
  id = "commit-doc-schema-discovery";
  name = "Commit resolves documentation schema roles from AGENTS.md";
  skill = "commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "RoleDocs",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const agentsPath = join(sandboxPath, "AGENTS.md");
    let agents = await Deno.readTextFile(agentsPath);
    agents = agents.replace(
      /## Documentation Hierarchy\n[\s\S]*?(?=\n## )/,
      `## Documentation Hierarchy
1. **\`AGENTS.md\`**: Project vision, constraints, mandatory rules.
2. **SRS** (\`specs/requirements.md\`): "What" & "Why". Source of truth for requirements.
3. **SDS** (\`architecture/system.md\`): "How". Architecture and implementation. Depends on SRS.
4. **Tasks** (\`records/tasks/<YYYY>/<MM>/<slug>.md\`): Persistent committed plans/notes per task.
5. **Index** (\`records/index.md\`): Documentation navigation aggregate.
6. **\`README.md\`**: Public-facing overview.

`,
    );
    agents += `
## Documentation Map

- \`api.ts\` -> [FR-API](specs/requirements.md#fr-api-api-functions), [SDS API](architecture/system.md#api)
`;
    await Deno.writeTextFile(agentsPath, agents);
    await Deno.mkdir(join(sandboxPath, "specs"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "architecture"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "specs", "requirements.md"),
      "# SRS\n\n## 3. Functional Requirements\n\n### FR-API: API Functions\n\n- **Description:** API helpers are documented here.\n- **Acceptance:** manual — reviewer\n",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "architecture", "system.md"),
      "# SDS\n\n## 3. Components\n\n### API\n\n- **Purpose:** API helper module.\n",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Configure role docs"]);

    await Deno.writeTextFile(
      join(sandboxPath, "api.ts"),
      'export function listUsers() {\n  return [{ id: 1, name: "Alice" }];\n}\n',
    );
  }

  userQuery = "/commit Added listUsers API helper in api.ts.";

  checklist = [
    {
      id: "read_role_srs",
      description:
        "Did the agent read or update `specs/requirements.md` as the SRS for `api.ts`?",
      critical: true,
    },
    {
      id: "read_role_sds",
      description:
        "Did the agent read or update `architecture/system.md` as the SDS for `api.ts`?",
      critical: true,
    },
    {
      id: "no_default_docs_created",
      description:
        "Did the agent avoid creating or updating default-path SRS/SDS files?",
      critical: true,
    },
    {
      id: "code_committed",
      description: "Is `api.ts` present in a commit?",
      critical: true,
    },
  ];
}();
