import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary match ("roadmap", "brainstorm") explicitly excluded
// in the description — generic ideation, not an executable epic file.
export const EpicTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-epic-trigger-false-1";
  name = "casual roadmap brainstorm";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Let's brainstorm what should go on next quarter's roadmap. I want a loose list, nothing structured.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
