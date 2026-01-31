import { join } from "@std/path";
import { BenchmarkScenario } from "../../../lib/types.ts";

const SKILL_PATH = "catalog/skills/af-init/SKILL.md";

export const InitBrownfieldBench: BenchmarkScenario = {
  id: "af-init-brownfield",
  name: "Init Brownfield Project with Architecture Discovery",
  targetAgentPath: SKILL_PATH,
  skillName: "af-init",

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Files are copied from fixture/
  },

  userQuery: "/af-init",

  checklist: [
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
      type: "semantic",
    },
    {
      id: "key_decisions_discovered",
      description:
        "Does AGENTS.md contain key decisions inferred from the project (e.g., using Deno, using TDD)?",
      critical: true,
      type: "semantic",
    },
    {
      id: "doc_rules_present",
      description:
        "Does AGENTS.md contain the new 'Code Documentation Rules' section?",
      critical: true,
      type: "semantic",
    },
    {
      id: "documents_folder_created",
      description:
        "Was the 'documents/' folder created with requirements.md and architecture.md?",
      critical: true,
    },
  ],
};
