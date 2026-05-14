import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: direct factual question — the user wants an answer, not an
// explorable tutorial artifact.
export const InteractiveTeachingMaterialsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-interactive-teaching-materials-trigger-false-1";
  name = "direct factual question";
  skill = "flowai-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quick question — what state does a TCP socket sit in after FIN is sent but the ACK hasn't come back yet?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-interactive-teaching-materials`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-interactive-teaching-materials/SKILL.md` or calling the `Skill` tool with `flowai-interactive-teaching-materials`.",
    critical: true,
  }];
}();
