import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the skill works, not a request to produce
// a teaching artifact.
export const InteractiveTeachingMaterialsTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-false-2";
  name = "meta question about the skill";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How do you decide when an interactive HTML lesson is the right format versus a regular doc page? Give me your rule of thumb.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
