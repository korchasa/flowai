import { join } from "@std/path";
import { BenchmarkScenario } from "../../../lib/types.ts";

const SKILL_PATH = "catalog/skills/af-init/SKILL.md";

export const InitGreenfieldBench: BenchmarkScenario = {
  id: "af-init-greenfield",
  name: "Init Greenfield Project with Interview",
  targetAgentPath: SKILL_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Empty directory for greenfield
  },

  userQuery: "/af-init",

  userPersona: `You are a developer starting a new project called 'MyProject'. 
Your vision is 'World domination'. 
Target audience is 'Everyone'. 
The problem is 'Boredom' and the solution is 'Fun'. 
There are no major risks. 
The tech stack is 'Deno' and 'TypeScript'. 
The architecture is 'Monolith'. 
When the agent asks for project details or starts an interview, provide these details. 
Always confirm when asked to overwrite or create files.`,

  checklist: [
    {
      id: "interview_started",
      description:
        "Did the agent start an interview to gather project details?",
      critical: true,
      type: "semantic",
    },
    {
      id: "agents_md_created",
      description:
        "Was AGENTS.md created after the interview (simulated or actual)?",
      critical: true,
    },
    {
      id: "doc_rules_present",
      description:
        "Does the generated AGENTS.md contain 'Code Documentation Rules'?",
      critical: true,
      type: "semantic",
    },
  ],
};
