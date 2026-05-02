import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary overlap ("context", "cost") but it is a generic business
// pricing question with no relationship to the live session's token state.
export const AnalyzeContextTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-false-3";
  name = "Anthropic pricing trivia";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What is Anthropic's published per-million-token price for Sonnet right now, and does it differ between input and output?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
