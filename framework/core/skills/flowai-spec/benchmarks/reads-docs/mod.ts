import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SpecReadsDocsBench = new class extends BenchmarkSkillScenario {
  id = "flowai-spec-reads-docs";
  name = "Spec reads SRS and SDS before spec creation";
  skill = "flowai-spec";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "EcomAuth",
    TOOLING_STACK: "- TypeScript\n- Deno",
    generateDocuments: true,
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked about phases, approve the proposed decomposition. Keep answers short.";

  userQuery =
    "/flowai-spec User authentication system with OAuth2 and JWT tokens.";

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
      id: "spec_created",
      description:
        "Did the agent create a spec file in 'documents/' (e.g., 'documents/spec-*.md')?",
      critical: true,
    },
  ];
}();
