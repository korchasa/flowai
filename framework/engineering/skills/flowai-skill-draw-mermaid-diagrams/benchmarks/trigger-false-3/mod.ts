import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: rendering/tooling bug — user wants their existing Mermaid block
// to render in a third-party tool, not a new diagram drawn.
export const DrawMermaidDiagramsTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-false-3";
  name = "rendering bug investigation";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My Mermaid block renders fine in GitHub but breaks in Notion — figure out which feature it is using that Notion does not support.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-draw-mermaid-diagrams`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-draw-mermaid-diagrams/SKILL.md` or calling the `Skill` tool with `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
