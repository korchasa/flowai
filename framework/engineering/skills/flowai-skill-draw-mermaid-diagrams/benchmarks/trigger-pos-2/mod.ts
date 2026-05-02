import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DrawMermaidDiagramsTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-pos-2";
  name = "diagram a state machine";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a diagram to my README that shows the order lifecycle moving through pending, paid, shipped, and refunded states.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-draw-mermaid-diagrams` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
