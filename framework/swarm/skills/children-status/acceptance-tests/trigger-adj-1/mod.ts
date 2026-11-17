import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: session-status (one session writing down its own state).
export const ChildrenStatusTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "children-status-trigger-adj-1";
  name = "ask one session for its own status (adjacent)";
  skill = "children-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write down where this session itself stands in its task file: the state, what is left and what you need from me. It has no child sessions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `children-status`? For this query the skill is not appropriate; the agent should either invoke a different skill (such as `session-status`) or respond directly without reading `children-status/SKILL.md` or calling the `Skill` tool with `children-status`.",
    critical: true,
  }];
}();
