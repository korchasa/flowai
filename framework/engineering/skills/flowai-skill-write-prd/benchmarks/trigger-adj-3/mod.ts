import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-epic (multi-phase delivery plan for a large
// feature; not a product-requirements specification).
export const WritePrdTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-adj-3";
  name = "multi-phase delivery epic (adjacent)";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Plan the rollout of multi-region storage as a multi-phase epic — dependency-ordered phases, atomic engineering tasks per phase.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
