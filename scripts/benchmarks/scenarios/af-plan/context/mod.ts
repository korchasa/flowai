import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

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
