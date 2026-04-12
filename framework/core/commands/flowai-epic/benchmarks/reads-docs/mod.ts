import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EpicReadsDocsBench = new class extends BenchmarkSkillScenario {
  id = "flowai-epic-reads-docs";
  name = "Epic reads SRS and SDS before epic creation";
  skill = "flowai-epic";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "EcomAuth",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked about phases, approve the proposed decomposition. Keep answers short.";

  userQuery =
    "/flowai-epic User authentication system with OAuth2 and JWT tokens.";

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
      id: "epic_created",
      description:
        "Did the agent create an epic file in 'documents/tasks/' (e.g., 'documents/tasks/epic-*.md')?",
      critical: true,
    },
  ];
}();
