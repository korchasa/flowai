import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary collision — "skill" in a video game / RPG sense, not a
// flowai SKILL.md package.
export const EngineerSkillTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-false-2";
  name = "rpg skill question (false-use)";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Design a skill tree for the engineer class in our RPG: which abilities should branch off the base node and what are good prerequisites?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
