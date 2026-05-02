import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-draw-mermaid-diagrams (a static diagram, not an
// interactive HTML artifact, is what the user is asking for).
export const InteractiveTeachingMaterialsTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-adj-1";
  name = "static mermaid diagram (adjacent)";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draw me a mermaid sequence diagram of how our login request flows from the gateway through to the user service.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
