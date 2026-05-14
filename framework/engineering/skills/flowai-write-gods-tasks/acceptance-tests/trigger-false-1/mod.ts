import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: task vocabulary, but the target format is a Jira ticket, not GODS.
export const WriteGodsTasksTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-write-gods-tasks-trigger-false-1";
  name = "Jira ticket draft";
  skill = "flowai-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Convert this user story into a Jira ticket with acceptance criteria for our PM to review.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-write-gods-tasks`.",
    critical: true,
  }];
}();
