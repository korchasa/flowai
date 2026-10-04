import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: general advice about instruction files, not a request to audit
// this session or edit anything.
export const ReflectGateTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "reflect-gate-trigger-false-1";
  name = "general advice on project instructions";
  skill = "reflect-gate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    "What kinds of lessons are worth writing into AGENTS.md after a coding session? General advice only.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `reflect-gate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `reflect-gate/SKILL.md` or calling the `Skill` tool with `reflect-gate`.",
    critical: true,
  }];
}();
