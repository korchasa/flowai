import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const PlanContextBench = new class extends BenchmarkSkillScenario {
  id = "af-plan-context";
  name = "Plan with Context Gathering";
  skill = "af-plan";

  userQuery =
    "/af-plan Plan implementation of the requirement described in documents/requirements.md.";

  checklist = [
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
  ];
}();
