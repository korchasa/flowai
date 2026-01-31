import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanContextBench: BenchmarkScenario = {
  id: "af-plan-context",
  name: "Plan with Context Gathering",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // Context is now in fixture/
  },

  userQuery:
    "/af-plan Plan implementation of the requirement described in documents/requirements.md.",

  checklist: [
    {
      id: "context_read",
      description: "Did the agent read 'documents/requirements.md'?",
      critical: true,
    },
    {
      id: "whiteboard_context",
      description:
        "Does the plan in 'documents/whiteboard.md' mention 'dark mode'?",
      critical: true,
    },
  ],
};
