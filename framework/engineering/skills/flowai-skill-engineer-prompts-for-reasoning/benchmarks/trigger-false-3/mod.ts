import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: pricing/operations question for a smart model — vocabulary overlap
// with "reasoning models" but no prompt design involved.
export const EngineerPromptsForReasoningTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-false-3";
  name = "smart model pricing question";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What is the current per-million-token rate for Claude 3.5 Sonnet versus GPT-4o and which has the longer context window?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
