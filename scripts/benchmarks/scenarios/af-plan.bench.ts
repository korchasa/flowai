import { BenchmarkScenario } from "../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

export const PlanBasicBench: BenchmarkScenario = {
  id: "af-plan-basic",
  name: "Basic Plan Generation",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    // Create documents directory as it's expected
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  },

  userQuery:
    "Plan a new feature to add a 'hello world' endpoint. The project is a simple Node.js Express server. The server file is index.js. No other constraints.",

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
      type: "semantic", // This implies we might need LLM judging, but regex might suffice for "Variant"
    },
  ],
};

export const PlanContextBench: BenchmarkScenario = {
  id: "af-plan-context",
  name: "Plan with Context Gathering",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "documents/requirements.md"),
      "# Requirements\n\nRequirement: The system must support dark mode preference.",
    );
  },

  userQuery:
    "Plan implementation of the requirement described in documents/requirements.md.",

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
