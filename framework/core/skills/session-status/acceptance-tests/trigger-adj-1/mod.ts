import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: tasks-overview (the task list of the whole project, not one session).
export const SessionStatusTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "session-status-trigger-adj-1";
  name = "ask which project tasks are open (adjacent)";
  skill = "session-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which tasks are still open in this project, and how far along are they?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `session-status`? For this query the skill is not appropriate; the agent should either invoke a different skill (such as `tasks-overview`) or respond directly without reading `session-status/SKILL.md` or calling the `Skill` tool with `session-status`.",
    critical: true,
  }];
}();
