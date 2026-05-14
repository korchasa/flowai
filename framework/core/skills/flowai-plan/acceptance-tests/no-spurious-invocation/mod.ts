import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-plan-no-spurious-invocation";
  name = "Plan — No Spurious Auto-Invocation";
  skill = "flowai-plan";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Roughly, how would you approach adding caching to an HTTP server? One paragraph is enough.";

  checklist = [
    {
      id: "no_task_file",
      description:
        "Did the agent NOT create any file in documents/tasks/? A casual design-discussion question must not trigger the GODS-format planning workflow.",
      critical: true,
    },
    {
      id: "no_gods_structure",
      description:
        "Did the agent NOT produce a GODS-format plan (Goal / Overview / Definition of Done / Solution sections, variants, critique)?",
      critical: true,
    },
    {
      id: "brief_conceptual_answer",
      description:
        "Did the agent answer with a short paragraph describing caching approaches, rather than entering the planning workflow?",
      critical: true,
    },
  ];
}();
