import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupTsStrictNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-setup-agent-code-style-ts-strict-no-spurious-invocation";
  name = "Setup TS Strict — No Spurious Auto-Invocation";
  skill = "flowai-setup-agent-code-style-ts-strict";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "What does TypeScript's 'strict' compiler flag actually enable under the hood?";

  checklist = [
    {
      id: "no_agents_md_write",
      description:
        "Did the agent NOT modify or create AGENTS.md? A general question about strict mode must not trigger the code-style setup workflow.",
      critical: true,
    },
    {
      id: "no_style_rules",
      description:
        "Did the agent NOT append TypeScript strict-mode code-style rules to any project file?",
      critical: true,
    },
    {
      id: "explanatory_answer",
      description:
        "Did the agent answer by listing what `strict` implies (noImplicitAny, strictNullChecks, etc.) rather than running the setup workflow?",
      critical: true,
    },
  ];
}();
