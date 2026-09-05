import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanBasicBench = new class extends AcceptanceTestScenario {
  id = "plan-basic";
  name = "Basic Plan Generation";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- Node.js\n- Express",
  };
  interactive = true;
  // The persona answers questions and nothing more: on the 2026-09-02 sweep
  // it volunteered "now implement it", and the plan run ended in a question
  // about scope the planner is not allowed to take on.
  userPersona =
    "A pragmatic developer who prefers the simplest approach. Answer ONLY what the agent asks, in one short sentence. When asked to choose a variant, pick variant A (or the first/simplest one). Never ask the agent to implement, run, or extend anything — the plan is the whole deliverable; if the agent says it is done, reply 'Thanks, that is all.' If the agent asks whether to initialize or create project documents, reply 'Do not create or initialize any documents; note it in the plan instead.'";

  userQuery =
    "/plan Plan a new feature to add a 'hello world' endpoint. The project is a simple Node.js Express server. The server file is index.js. No other constraints.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write to a file in 'documents/tasks/' directory?",
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
    },
    {
      id: "critique_performed",
      description:
        "Did the agent automatically critique the plan (risks, gaps, edge cases) without asking permission first?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify any source code files (only task file in documents/tasks/)?",
      critical: true,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
    },
  ];
}();
