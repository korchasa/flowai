import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanBasicBench: BenchmarkScenario = {
  id: "af-plan-basic",
  name: "Basic Plan Generation",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // Documents directory is now created automatically by fixture copying
  },

  userQuery:
    "/af-plan Plan a new feature to add a 'hello world' endpoint. The project is a simple Node.js Express server. The server file is index.js. No other constraints.",

  checklist: [
    {
      id: "whiteboard_created",
      description: "Did the agent create/write to 'documents/whiteboard.md'?",
      critical: true,
    },
    {
      id: "gods_structure",
      description:
        "Does the plan follow GODS (Goal, Overview, Definition of Done)?",
      critical: true,
    },
    {
      id: "variants_presented",
      description: "Did the agent present implementation variants in the chat?",
      critical: true,
      type: "semantic",
    },
  ],
};
