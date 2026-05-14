import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: surface vocabulary match ("context", "tokens") but the user is asking
// about model architecture trivia, not their session's actual usage.
export const AnalyzeContextTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-analyze-context-trigger-false-1";
  name = "model context length trivia";
  skill = "flowai-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What is the maximum context length of GPT-4o, and how does it tokenize Cyrillic text compared to English?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-analyze-context`.",
    critical: true,
  }];
}();
