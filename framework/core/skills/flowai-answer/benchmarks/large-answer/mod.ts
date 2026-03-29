import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AnswerLargeResponseBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-answer-large-response";
  name = "Large Answer Saved to Whiteboard";
  skill = "flowai-answer";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "AuthService",
    TOOLING_STACK: "- TypeScript",
    generateDocuments: true,
  };

  userQuery =
    "/flowai-answer Provide a comprehensive analysis of the entire authentication architecture in this project. Compare it against the requirements and design documents. Cover: password hashing, session management, token validation, middleware chain, error handling, and security best practices. This needs to be thorough — save the full analysis to a file.";

  checklist = [
    {
      id: "docs_read",
      description:
        "Did the agent read project documentation (requirements.md, design.md)?",
      critical: true,
    },
    {
      id: "code_read",
      description:
        "Did the agent read source code files (src/auth.service.ts and related)?",
      critical: true,
    },
    {
      id: "whiteboard_saved",
      description:
        "Did the agent save the analysis to a file in 'documents/whiteboards/' directory?",
      critical: true,
    },
    {
      id: "read_only",
      description:
        "Did the agent keep repo source files unchanged (no edits to source code or config)?",
      critical: true,
    },
    {
      id: "comprehensive",
      description:
        "Does the analysis cover multiple aspects (hashing, sessions, validation, security)?",
      critical: false,
    },
  ];
}();
