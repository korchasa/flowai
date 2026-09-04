import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: plan (writing a new task file, not surveying existing ones).
export const TasksOverviewTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-trigger-adj-1";
  name = "plan a new task (adjacent)";
  skill = "tasks-overview";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery = "Plan a task for adding rate limiting to the API.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `tasks-overview`? For this query the skill is not appropriate; the agent should either invoke a different skill (such as `plan`) or respond directly without reading `tasks-overview/SKILL.md` or calling the `Skill` tool with `tasks-overview`.",
    critical: true,
  }];
}();
