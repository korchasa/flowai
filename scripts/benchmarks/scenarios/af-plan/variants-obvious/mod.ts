import { join } from "@std/path";
import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanVariantsObviousBench: BenchmarkScenario = {
  id: "af-plan-variants-obvious",
  name: "Plan Variants - Obvious Task",
  targetAgentPath: AGENT_PATH,
  skillName: "af-plan",

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  },

  userQuery:
    "/af-plan Plan the creation of a 'hello.txt' file containing 'Hello World'. Context: This is a test project. No other requirements. Just plan it.",

  checklist: [
    {
      id: "whiteboard_created",
      description:
        "Did the agent create/write to 'documents/whiteboard.md' (as required by the planning process)?",
      critical: true,
    },
    {
      id: "single_variant",
      description:
        "Did the agent present EXACTLY ONE implementation variant in the chat? It should NOT offer alternatives for such a simple task.",
      critical: true,
      type: "semantic",
    },
  ],
};
