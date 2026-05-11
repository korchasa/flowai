import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerRuleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-rule-trigger-pos-1";
  name = "add coding standard";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a project-wide rule that the agent should always use named exports and never default exports in our codebase.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-rule` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
