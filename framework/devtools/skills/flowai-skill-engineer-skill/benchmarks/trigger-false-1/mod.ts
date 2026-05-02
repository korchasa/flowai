import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how skills are organized, not a request to
// author one.
export const EngineerSkillTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-false-1";
  name = "meta question about skills";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does the agent decide between two competing skills when both descriptions sort of match the user's request?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
