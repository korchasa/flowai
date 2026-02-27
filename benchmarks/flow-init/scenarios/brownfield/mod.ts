import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const InitBrownfieldBench = new class extends BenchmarkSkillScenario {
  id = "flow-init-brownfield";
  name = "Init Brownfield Project with Architecture Discovery";
  skill = "flow-init";

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Files are copied from fixture/
  }

  userQuery = "/flow-init";

  checklist = [
    {
      id: "agents_md_created",
      description: "Was AGENTS.md created?",
      critical: true,
    },
    {
      id: "documents_agents_md_created",
      description:
        "Was documents/AGENTS.md created with documentation structure rules?",
      critical: true,
    },
    {
      id: "scripts_agents_md_created",
      description: "Was scripts/AGENTS.md created with development commands?",
      critical: true,
    },
    {
      id: "architecture_discovered",
      description:
        "Does AGENTS.md contain architecture description inferred from the project (Express, TypeScript)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "key_decisions_discovered",
      description:
        "Does AGENTS.md contain key decisions inferred from the project (e.g., using Deno, using TDD)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "doc_rules_present",
      description:
        "Does documents/AGENTS.md contain the 'Documentation Rules' or DOCS STRUCTURE section?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "documents_folder_created",
      description:
        "Was the 'documents/' folder created with requirements.md, design.md and whiteboard.md?",
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
  ];
}();
