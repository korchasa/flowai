import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: editing one task's status by hand, not viewing the overall state.
export const TasksOverviewTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-trigger-false-1";
  name = "edit one task's status (false use)";
  skill = "tasks-overview";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Mark the add-cache task as done in its frontmatter — just flip the status field, nothing else.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `tasks-overview`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `tasks-overview/SKILL.md` or calling the `Skill` tool with `tasks-overview`.",
    critical: true,
  }];
}();
