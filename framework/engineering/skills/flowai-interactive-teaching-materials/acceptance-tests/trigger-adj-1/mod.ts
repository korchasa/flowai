import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-draw-mermaid-diagrams (a static diagram, not an
// interactive HTML artifact, is what the user is asking for).
export const InteractiveTeachingMaterialsTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-interactive-teaching-materials-trigger-adj-1";
  name = "static mermaid diagram (adjacent)";
  skill = "flowai-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draw me a mermaid sequence diagram of how our login request flows from the gateway through to the user service.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-interactive-teaching-materials`.",
    critical: true,
  }];
}();
