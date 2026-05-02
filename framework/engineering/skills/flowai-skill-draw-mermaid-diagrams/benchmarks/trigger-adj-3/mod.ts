import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan (turn the design into a planned task with
// phases and DoD — planning, not visualisation).
export const DrawMermaidDiagramsTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-adj-3";
  name = "plan the work (adjacent)";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Turn the new authentication design into a planned task with phases, definition of done, and a saved task file.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-draw-mermaid-diagrams`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-draw-mermaid-diagrams/SKILL.md` or calling the `Skill` tool with `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
