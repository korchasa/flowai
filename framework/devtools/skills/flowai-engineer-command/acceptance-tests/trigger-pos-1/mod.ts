import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerCommandTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-command-trigger-pos-1";
  name = "new slash command request";
  skill = "flowai-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a new slash command for our team that runs our standard release checklist. How do I set that up?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-engineer-command` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-engineer-command`.",
    critical: true,
  }];
}();
