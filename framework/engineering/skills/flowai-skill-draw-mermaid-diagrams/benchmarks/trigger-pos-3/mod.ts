import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DrawMermaidDiagramsTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-draw-mermaid-diagrams-trigger-pos-3";
  name = "edit existing flowchart";
  skill = "flowai-skill-draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open documents/design.md and update the flowchart so the new payment-retry branch is shown clearly.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-draw-mermaid-diagrams` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-draw-mermaid-diagrams`.",
    critical: true,
  }];
}();
