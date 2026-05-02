import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-adapt-instructions (re-aligning AGENTS.md to the
// installed template, not authoring a brand-new rule).
export const EngineerRuleTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-adj-2";
  name = "adapt instructions (adjacent)";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "After the last flowai sync the AGENTS.md template changed. Realign our project AGENTS.md to the new template while keeping our custom sections.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
