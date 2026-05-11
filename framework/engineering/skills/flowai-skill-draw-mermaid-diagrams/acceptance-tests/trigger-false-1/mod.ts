import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: surface vocabulary match ("diagram") but the user wants a static
// PNG/SVG image asset, not a Mermaid block in Markdown.
export const DrawMermaidDiagramsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-false-1";
  name = "static image asset request";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a polished PNG architecture diagram with custom icons and brand colors for our investor deck.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-draw-mermaid-diagrams`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-draw-mermaid-diagrams/SKILL.md` or calling the `Skill` tool with `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
