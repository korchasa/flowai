import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-plan (single-session task plan in GODS format,
// not a multi-phase epic).
export const EpicTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-epic-trigger-adj-1";
  name = "single-session task plan (adjacent)";
  skill = "flowai-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a `--dry-run` flag to the CLI today. Write the GODS task file before I start coding.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-epic/SKILL.md` or calling the `Skill` tool with `flowai-epic`.",
    critical: true,
  }];
}();
