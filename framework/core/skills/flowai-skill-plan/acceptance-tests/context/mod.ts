import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanContextBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-plan-context";
  name = "Plan with Context Gathering";
  skill = "flowai-skill-plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno\n- Prisma",
  };

  userQuery =
    "/flowai-skill-plan Plan implementation of the requirement described in documents/requirements.md.";

  checklist = [
    {
      id: "context_read",
      description: "Did the agent read 'documents/requirements.md'?",
      critical: true,
    },
    {
      id: "context_read_sds",
      description: "Did the agent read 'documents/design.md'?",
      critical: false,
    },
    {
      id: "task_file_context",
      description: "Does the plan in 'documents/tasks/' mention 'dark mode'?",
      critical: true,
    },
  ];
}();
