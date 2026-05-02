import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-diagnose-benchmark-failure (specific to a
// failed flowai benchmark, not a general production bug investigation).
export const InvestigateTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-adj-2";
  name = "diagnose flowai benchmark failure (adjacent)";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The `flowai-skill-plan-trigger-pos-2` benchmark scenario just failed. Read the run artifacts and tell me what went wrong.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-investigate/SKILL.md` or calling the `Skill` tool with `flowai-skill-investigate`.",
    critical: true,
  }];
}();
