import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("interactive", "tutorial") but the user
// is asking to fix a broken existing site, not to author a new teaching artifact.
export const InteractiveTeachingMaterialsTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-false-3";
  name = "fix existing tutorial site (false-use)";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our existing interactive tutorial site is throwing a JS error on the second page — can you debug why the next-step button does nothing?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
