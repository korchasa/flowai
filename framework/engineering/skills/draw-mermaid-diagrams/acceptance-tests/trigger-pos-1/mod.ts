import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DrawMermaidDiagramsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "draw-mermaid-diagrams-trigger-pos-1";
  name = "visualize a sequence of calls";
  skill = "draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  // 2026-08-24: the old query — "Sketch out the order of calls between the API
  // gateway, the auth service, and the database when a user logs in" — never
  // asked for a diagram. The model answered with a numbered prose list and
  // closed with "Want me to turn this into a Mermaid sequence diagram?", which
  // is a correct answer to what was asked. A positive trigger has to name the
  // skill's deliverable; naming it is not a hint, it is the request.
  userQuery =
    "Draw a sequence diagram of what happens between the API gateway, the auth service and the database when a user logs in, so I can paste it into our README.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `draw-mermaid-diagrams` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
