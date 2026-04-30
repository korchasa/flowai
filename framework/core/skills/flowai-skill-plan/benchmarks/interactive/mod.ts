import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanInteractiveBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-interactive";
  name = "Plan with Interactive Variant Selection";
  skill = "flowai-skill-plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-plan Plan a simple CLI tool that prints 'Hello World'.";

  userPersona = `You are a developer who prefers simplicity.
IMPORTANT: The agent may speak Russian. When you see a question ending with '?' or asking you to choose (e.g. 'Какой вариант', 'выбираете', 'предпочитаете', 'подтвердите'), you MUST respond.
When asked to choose between variants, pick the one that seems simplest and say so briefly.
When asked for confirmation, agree and ask to proceed.`;

  interactive = true;

  checklist = [
    {
      id: "variants_presented",
      description: "Did the agent present implementation variants in the chat?",
      critical: true,
    },
    {
      id: "question_asked",
      description:
        "Did the agent ask the user to select an implementation variant?",
      critical: true,
    },
    {
      id: "solution_filled",
      description:
        "Check the 'Solution' section in the task file in 'documents/tasks/'. It MUST contain concrete technical implementation details (not a placeholder, not a comment like '<!-- ... -->', not '_To be filled..._'). If the Solution section is empty, contains only a placeholder comment, or says 'to be filled', this check FAILS.",
      critical: true,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
    },
    {
      id: "qa_format_compliant",
      description:
        "When the agent asked the user to choose a variant, did it follow FR-UNIVERSAL.QA-FORMAT? Concretely: the question is a numbered list item (a line starting with '1.', '2.', ...) — NOT a bold heading like '**1. Title**', a Markdown heading, or a bare paragraph.",
      critical: true,
    },
  ];
}();
