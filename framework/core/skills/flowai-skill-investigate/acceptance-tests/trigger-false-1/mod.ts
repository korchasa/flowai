import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: trivial error-message lookup, explicitly excluded — the cause is
// obvious from a quick read, no hypothesis-driven investigation warranted.
export const InvestigateTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-investigate-trigger-false-1";
  name = "trivial error-message lookup";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does this error mean: `error: Cannot find module 'lodash'`? Just tell me how to fix it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-investigate/SKILL.md` or calling the `Skill` tool with `flowai-skill-investigate`.",
    critical: true,
  }];
}();
