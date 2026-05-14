import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DrawMermaidDiagramsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-draw-mermaid-diagrams-trigger-pos-1";
  name = "visualize a sequence of calls";
  skill = "flowai-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Sketch out the order of calls between the API gateway, the auth service, and the database when a user logs in.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-draw-mermaid-diagrams` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
