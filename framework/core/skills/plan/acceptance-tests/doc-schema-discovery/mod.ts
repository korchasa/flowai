import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const PlanDocSchemaDiscoveryBench = new class
  extends AcceptanceTestScenario {
  id = "plan-doc-schema-discovery";
  name = "Plan resolves documentation schema roles from AGENTS.md";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "RoleDocs",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a variant, pick the simplest one. Keep answers short.";

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
    await Deno.writeTextFile(agentsPath, agents);
    await Deno.mkdir(join(sandboxPath, "specs"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "architecture"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "records", "tasks"), {
      recursive: true,
    });
    await Deno.writeTextFile(
      join(sandboxPath, "specs", "requirements.md"),
      "# SRS\n\n## 3. Functional Requirements\n\n### FR-CACHE: Cache API\n\n- **Description:** GET endpoints need cache control.\n- **Acceptance:** manual — reviewer\n",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "architecture", "system.md"),
      "# SDS\n\n## 3. Components\n\n### API\n\n- **Purpose:** HTTP endpoints.\n",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "records", "index.md"),
      "## FR\n",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Configure role docs"]);
  }

  userQuery = "/plan Add cache invalidation for API writes.";

  checklist = [
    {
      id: "read_role_srs",
      description: "Did the agent read `specs/requirements.md` as SRS?",
      critical: true,
    },
    {
      id: "read_role_sds",
      description: "Did the agent read `architecture/system.md` as SDS?",
      critical: true,
    },
    {
      id: "wrote_role_task",
      description:
        "Did the agent create the task under `records/tasks/<YYYY>/<MM>/` and avoid creating a task under the default path?",
      critical: true,
    },
    {
      id: "updated_role_index",
      description:
        "Did the agent update `records/index.md` and avoid creating the default index file?",
      critical: true,
    },
  ];
}();
