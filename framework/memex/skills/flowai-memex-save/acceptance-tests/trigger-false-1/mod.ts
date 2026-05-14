import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: "save" wording but the intent is git commit, not memex persistence.
export const MemexSaveTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-memex-save-trigger-false-1";
  name = "git commit phrased as 'save' (wrong intent)";
  skill = "flowai-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Save my changes to the repo — stage everything modified and write a sensible commit message.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-memex-save`.",
    critical: true,
  }];
}();
