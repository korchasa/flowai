import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const InitBrownfieldBench = new class extends BenchmarkSkillScenario {
  id = "af-init-brownfield";
  name = "Init Brownfield Project with Architecture Discovery";
  skill = "af-init";

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Files are copied from fixture/
  }

  userQuery = "/af-init";

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
        "Does AGENTS.md contain the new 'Code Documentation Rules' section?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "documents_folder_created",
      description:
        "Was the 'documents/' folder created with requirements.md, design.md and whiteboard.md?",
      critical: true,
    },
  ];
}();
