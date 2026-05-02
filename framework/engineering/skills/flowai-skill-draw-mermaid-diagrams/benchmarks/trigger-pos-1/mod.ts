import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DrawMermaidDiagramsTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-pos-1";
  name = "visualize a sequence of calls";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Sketch out the order of calls between the API gateway, the auth service, and the database when a user logs in.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-draw-mermaid-diagrams` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
