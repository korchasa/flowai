import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const PlanBasicBench = new class extends BenchmarkSkillScenario {
  id = "flowai-plan-basic";
  name = "Basic Plan Generation";
  skill = "flowai-plan";
  stepTimeoutMs = 120_000;
  interactive = true;
  userPersona =
    "A pragmatic developer who prefers the simplest approach. When asked to choose a variant, pick variant A (or the first/simplest one). When asked about critique, agree to it. Keep answers short.";

  userQuery =
    "/flowai-plan Plan a new feature to add a 'hello world' endpoint. The project is a simple Node.js Express server. The server file is index.js. No other constraints.";

  checklist = [
    {
      id: "whiteboard_created",
      description:
        "Did the agent create/write to a file in 'documents/whiteboards/' directory?",
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
      type: "semantic" as const,
    },
    {
      id: "critique_offered",
      description:
        "Did the agent offer to critique the plan after detailing the solution?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
