import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (diagnose a bug, not fix a failing test).
export const FixTestsTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-adj-2";
  name = "investigate-not-fix query (adjacent)";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to figure out why our checkout flow occasionally drops the cart in production. Don't fix anything — just diagnose what's going on.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
