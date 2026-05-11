import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupTsDenoNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-no-spurious-invocation";
  name = "Setup TS Deno — No Spurious Auto-Invocation";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "In one paragraph, what is Deno and how does it differ from Node.js?";

  checklist = [
    {
      id: "no_agents_md_write",
      description:
        "Did the agent NOT modify or create AGENTS.md? A general question about Deno must not trigger the code-style setup workflow.",
      critical: true,
    },
    {
      id: "no_style_rules",
      description:
        "Did the agent NOT append Deno/TypeScript code-style rules to any project file?",
      critical: true,
    },
    {
      id: "conceptual_answer",
      description:
        "Did the agent answer with a short conceptual comparison of Deno vs Node.js rather than running the setup workflow?",
      critical: true,
    },
  ];
}();
