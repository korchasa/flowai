import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False use: the words session and status in a question about an HTTP API.
export const SessionStatusTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "session-status-trigger-false-1";
  name = "ask about an HTTP status code (false use)";
  skill = "session-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which HTTP status code should our API return when the login session has expired — 401 or 403? Answer in two sentences.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `session-status`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `session-status/SKILL.md` or calling the `Skill` tool with `session-status`.",
    critical: true,
  }];
}();
