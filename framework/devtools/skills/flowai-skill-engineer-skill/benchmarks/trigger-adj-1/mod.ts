import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-command (user-invoked workflow, not an
// agent-invocable skill).
export const EngineerSkillTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-adj-1";
  name = "user-invoked workflow (adjacent)";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a slash command I can invoke before every release that walks the agent through our deployment checklist step by step. Set it up.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
