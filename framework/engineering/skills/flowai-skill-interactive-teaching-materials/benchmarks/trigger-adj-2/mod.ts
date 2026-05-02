import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (the user wants a researched
// written explanation, not an interactive HTML artifact).
export const InteractiveTeachingMaterialsTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-adj-2";
  name = "researched written explanation (adjacent)";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Research and write me a thorough markdown explainer on how Raft handles leader election, with citations to the original paper.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
