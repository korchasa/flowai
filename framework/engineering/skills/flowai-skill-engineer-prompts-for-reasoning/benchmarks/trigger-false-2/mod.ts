import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("reasoning") but the user means human
// debate practice, not LLM prompt design.
export const EngineerPromptsForReasoningTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-false-2";
  name = "human debate prompt";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Suggest a few good debate prompts I can give my students to practice structured reasoning out loud in class.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
