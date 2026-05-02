import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-setup-agent-code-style-ts-strict (strict-mode
// TypeScript code-style scaffold, not a general rule-authoring task).
export const EngineerRuleTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-adj-3";
  name = "strict TS code-style scaffold (adjacent)";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We use TypeScript with strict mode in this Node project. Add the standard set of strict-TS code-style rules so the agent follows them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
