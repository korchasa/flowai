import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: the session is asked to record and report its own state.
export const SessionStatusTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "session-status-trigger-pos-1";
  name = "ask the session to record where it stands";
  skill = "session-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write down where this session stands in its task file and report it: the state, what is left, what is not verified and what you need from me.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `session-status` for this request? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `session-status`.",
    critical: true,
  }];
}();
