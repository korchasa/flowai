import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how rules work, not a request to author one.
export const EngineerRuleTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-false-2";
  name = "meta question about rules";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the difference between a rule and a skill in this framework, and how does the agent decide which to apply first?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
