import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: applying an existing rule to code is execution, not authoring a new
// rule.
export const EngineerRuleTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-false-3";
  name = "apply existing rule (false-use)";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our AGENTS.md says all functions need JSDoc. Go through src/utils.ts and add JSDoc comments where they're missing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
