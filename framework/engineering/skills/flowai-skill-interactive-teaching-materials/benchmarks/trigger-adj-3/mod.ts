import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-in-informational-style (plain prose
// explanation in informational style, no interactive artifact).
export const InteractiveTeachingMaterialsTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-adj-3";
  name = "plain prose explainer (adjacent)";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a short, neutral, informational article explaining how DNS resolution works for our internal wiki — no diagrams, just prose.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
