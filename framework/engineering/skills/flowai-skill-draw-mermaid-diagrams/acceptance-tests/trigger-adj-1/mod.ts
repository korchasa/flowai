import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-interactive-teaching-materials (clickable HTML
// tutorial with embedded diagrams — broader artifact than a single Mermaid block).
export const DrawMermaidDiagramsTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-adj-1";
  name = "interactive html tutorial (adjacent)";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Build me an explorable HTML tutorial that lets readers click through each step of the OAuth state machine.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-draw-mermaid-diagrams`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-draw-mermaid-diagrams/SKILL.md` or calling the `Skill` tool with `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
