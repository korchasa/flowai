import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-prd (Product Requirements Document — a
// product-spec artifact, not an engineering execution plan).
export const EpicTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-adj-2";
  name = "write a PRD (adjacent)";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a product requirements document for the new in-app notifications feature: goals, users, success metrics.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
