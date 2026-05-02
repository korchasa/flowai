import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-rule (authoring a specific rule, not
// surfacing patterns from history that motivate one).
export const ReflectByHistoryTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-adj-2";
  name = "author a new rule (adjacent)";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a rule that says: never edit lockfiles by hand. Where should it live and how should it be phrased?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
