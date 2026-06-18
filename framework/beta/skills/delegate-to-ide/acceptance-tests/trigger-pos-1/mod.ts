import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DelegateToIdeTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "delegate-to-ide-trigger-pos-1";
  name = "delegate a task to another IDE";
  skill = "delegate-to-ide";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Have Codex implement a small TypeScript helper that capitalises a string, and show me its answer.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `delegate-to-ide` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `delegate-to-ide`.",
    critical: true,
  }];
}();
