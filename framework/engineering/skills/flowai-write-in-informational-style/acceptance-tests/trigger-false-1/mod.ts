import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: rewrite request, but the target register is persuasive, not
// informational.
export const WriteInInformationalStyleTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-write-in-informational-style-trigger-false-1";
  name = "persuasive rewrite request";
  skill = "flowai-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Make this product launch email more persuasive and energetic — I want excitement, not facts.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-write-in-informational-style`.",
    critical: true,
  }];
}();
