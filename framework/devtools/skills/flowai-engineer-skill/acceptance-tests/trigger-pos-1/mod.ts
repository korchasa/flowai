import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerSkillTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-skill-trigger-pos-1";
  name = "create new skill request";
  skill = "flowai-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to create a new skill that walks the agent through writing a postmortem document. Help me set it up properly.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-engineer-skill` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-engineer-skill`.",
    critical: true,
  }];
}();
