import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanReadsDocsBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-plan-reads-docs";
  name = "Plan reads SRS and SDS before planning";
  skill = "flowai-skill-plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TaskAPI",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a variant, pick the simplest one. Keep answers short.";

  userQuery = "/flowai-skill-plan Add a caching layer for the API endpoints.";

  checklist = [
    {
      id: "read_srs",
      description: "Did the agent read 'documents/requirements.md'?",
      critical: true,
    },
    {
      id: "read_sds",
      description: "Did the agent read 'documents/design.md'?",
      critical: true,
    },
    {
      id: "task_file_created",
      description: "Did the agent create a task file in 'documents/tasks/'?",
      critical: true,
    },
  ];
}();
