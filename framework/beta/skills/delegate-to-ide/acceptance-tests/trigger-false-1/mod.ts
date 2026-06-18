import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: in-domain wording ("Codex") but the wrong intent — the user
// wants to TWEAK the target IDE's local settings, not delegate work to it.
export const DelegateToIdeTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "delegate-to-ide-trigger-false-1";
  name = "edit Codex config (false-use)";
  skill = "delegate-to-ide";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Update my Codex config to use the `gpt-5` model by default and increase the timeout to 5 minutes.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `delegate-to-ide`? For this query the user is editing Codex's local configuration, NOT delegating a task to Codex. The agent should either invoke a different skill or respond directly without reading `delegate-to-ide/SKILL.md` or calling the `Skill` tool with `delegate-to-ide`.",
    critical: true,
  }];
}();
