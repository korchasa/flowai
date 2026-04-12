import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InitBrownfieldBench = new class extends BenchmarkSkillScenario {
  id = "flowai-init-brownfield";
  name = "Init Brownfield Project with Architecture Discovery";
  skill = "flowai-init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;
  agentsTemplateVars = {
    PROJECT_NAME: "InitTestProject",
    TOOLING_STACK: "- TypeScript\n- Express",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Files are copied from fixture/
  }

  userQuery = "/flowai-init";

  userPersona =
    `You are a developer running flowai-init on an existing Express/TypeScript project.
When the agent asks questions about the project, confirm the defaults it discovers.
When asked to create or overwrite files, approve all changes.
When shown diffs or proposals, approve them.
Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "agents_md_created",
      description: "Was AGENTS.md created?",
      critical: true,
    },
    {
      id: "architecture_discovered",
      description:
        "Does AGENTS.md contain architecture description inferred from the project (Express, TypeScript)?",
      critical: true,
    },
    {
      id: "key_decisions_discovered",
      description:
        "Does AGENTS.md contain key decisions inferred from the project (e.g., using Deno, using TDD)?",
      critical: true,
    },
    {
      id: "doc_rules_present",
      description:
        "Does root AGENTS.md contain a '## Documentation Rules' section?",
      critical: true,
    },
    {
      id: "documents_folder_created",
      description:
        "Was the 'documents/' folder created with requirements.md and design.md?",
      critical: true,
    },
    {
      id: "dev_commands_created",
      description:
        "Were development command scripts created (e.g., scripts/check.ts for Deno)?",
      critical: true,
    },
    {
      id: "deno_json_tasks_updated",
      description:
        "Does deno.json contain tasks pointing to scripts/ (check, test, dev)?",
      critical: true,
    },
    {
      id: "no_hallucinations",
      description:
        "Does AGENTS.md only document tooling and architecture that actually exists in the project (no invented tools or frameworks)?",
      critical: true,
    },
    {
      id: "temp_files_cleaned",
      description:
        "Were temporary files (project_info.json, interview_data.json) removed during cleanup? (FR-INIT.CLEANUP)",
      critical: false,
    },
  ];
}();
