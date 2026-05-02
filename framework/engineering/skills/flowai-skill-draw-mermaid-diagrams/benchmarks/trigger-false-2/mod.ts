import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about Mermaid syntax for a blog post — explanation,
// not an actual diagram to draw.
export const DrawMermaidDiagramsTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-false-2";
  name = "meta syntax explainer";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "For a blog post, explain conceptually how Mermaid's flowchart syntax differs from PlantUML — no diagram needed, just the comparison.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-draw-mermaid-diagrams`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-draw-mermaid-diagrams/SKILL.md` or calling the `Skill` tool with `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
