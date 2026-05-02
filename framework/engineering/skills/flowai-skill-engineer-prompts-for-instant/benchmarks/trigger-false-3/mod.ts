import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: fine-tuning / model selection question — vocabulary overlap with
// "fast models" but the answer is operational, not prompt design.
export const EngineerPromptsForInstantTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-false-3";
  name = "fine-tuning a small model";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What is the cheapest way to fine-tune a small open-weights model on 5k examples — just looking at platform options.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
