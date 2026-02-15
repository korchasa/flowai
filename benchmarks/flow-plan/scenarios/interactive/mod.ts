import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const PlanInteractiveBench = new class extends BenchmarkSkillScenario {
  id = "flow-plan-interactive";
  name = "Plan with Interactive Variant Selection";
  skill = "flow-plan";

  userQuery = "/flow-plan Plan a simple CLI tool that prints 'Hello World'.";

  userPersona =
    "You are a developer who prefers Deno native implementation. When asked about implementation variants, always choose Variant 1 (Deno native).";

  interactive = true;

  checklist = [
    {
      id: "variants_presented",
      description: "Did the agent present implementation variants in the chat?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "question_asked",
      description:
        "Did the agent ask the user to select an implementation variant?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "solution_filled",
      description:
        "Is the 'Solution' section in 'documents/whiteboard.md' filled with technical details for the selected variant?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
      type: "static" as const,
    },
  ];
}();
