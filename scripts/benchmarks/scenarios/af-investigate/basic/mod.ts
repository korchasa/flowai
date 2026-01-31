import { BenchmarkScenario } from "../../../lib/types.ts";

const SKILL_PATH = "catalog/skills/af-investigate/SKILL.md";

export const InvestigateBasicBench: BenchmarkScenario = {
  id: "af-investigate-basic",
  name: "Basic Issue Investigation",
  targetAgentPath: SKILL_PATH,
  skillName: "af-investigate",

  setup: async (_sandboxPath: string) => {
    // Fixtures are copied automatically
  },

  userQuery:
    "/af-investigate The calculateTotal function in src/math.ts returns incorrect results. For price 10 and quantity 2, it returns 30 instead of 20. Investigate this. I want to see multiple hypotheses first. Use only standard CLI tools like cat, ls, grep.",

  checklist: [
    {
      id: "hypotheses_proposed",
      description: "Did the agent propose 3-7 hypotheses?",
      critical: true,
      type: "semantic",
    },
    {
      id: "user_control",
      description:
        "Did the agent STOP after proposing hypotheses and ask the user to select one?",
      critical: true,
      type: "semantic",
    },
  ],
};
