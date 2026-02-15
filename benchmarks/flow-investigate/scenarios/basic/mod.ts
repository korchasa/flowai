import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const InvestigateBasicBench = new class extends BenchmarkSkillScenario {
  id = "flow-investigate-basic";
  name = "Basic Issue Investigation";
  skill = "flow-investigate";

  userQuery =
    "/flow-investigate The calculateTotal function in src/math.ts returns incorrect results. For price 10 and quantity 2, it returns 30 instead of 20. Investigate this. I want to see multiple hypotheses first. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "hypotheses_proposed",
      description: "Did the agent propose 3-7 hypotheses?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "user_control",
      description:
        "Did the agent STOP after proposing hypotheses and ask the user to select one?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
