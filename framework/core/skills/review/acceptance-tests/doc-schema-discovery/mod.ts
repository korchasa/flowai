import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const ReviewDocSchemaDiscoveryBench = new class
  extends AcceptanceTestScenario {
  id = "review-doc-schema-discovery";
  name = "Review resolves documentation schema roles from AGENTS.md";
  skill = "review";
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
    await Deno.writeTextFile(agentsPath, agents);
    await Deno.mkdir(join(sandboxPath, "specs"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "architecture"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "specs", "requirements.md"),
      "# SRS\n\n## 3. Functional Requirements\n\n### FR-TRIM: Trim input\n\n- **Description:** Input processing trims whitespace.\n- **Acceptance:** manual — reviewer\n",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "architecture", "system.md"),
      "# SDS\n\n## 3. Components\n\n### Processor\n\n- **Purpose:** Normalize input strings.\n",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Configure role docs"]);

    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src", "main.ts"),
      "export function process(input: string): string {\n  return input.trim();\n}\n",
    );
    await runGit(sandboxPath, ["add", "src/main.ts"]);
  }

  userQuery = "/review";

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
      id: "no_default_doc_read",
      description:
        "Did the agent avoid relying on default documentation paths when reviewing?",
      critical: true,
    },
    {
      id: "verdict_given",
      description:
        "Did the agent produce a verdict (Approve, Request Changes, or Needs Discussion)?",
      critical: true,
    },
  ];
}();
