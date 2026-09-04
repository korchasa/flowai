import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const TasksOverviewTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-trigger-pos-1";
  name = "ask which tasks are still open";
  skill = "tasks-overview";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which tasks are still open in this project, and how far along are they?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `tasks-overview` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `tasks-overview`.",
    critical: true,
  }];
}();
