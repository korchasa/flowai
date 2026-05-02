import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (diagnostic root-cause work IN this
// codebase — controlled hypothesis-by-hypothesis investigation, not web research).
export const DeepResearchTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-adj-1";
  name = "root-cause investigation (adjacent)";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My queue worker is silently dropping messages once an hour — investigate hypothesis by hypothesis and pin down the root cause.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deep-research/SKILL.md` or calling the `Skill` tool with `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
