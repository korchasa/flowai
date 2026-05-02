import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-prd (a product requirements document —
// product-spec artifact, not an engineering implementation plan).
export const PlanTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-adj-3";
  name = "write a PRD (adjacent)";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a PRD for the new referral program — goals, target users, success metrics, scope.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
