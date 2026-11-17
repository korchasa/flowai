import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: the manager is asked for the state of all its children.
export const ChildrenStatusTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "children-status-trigger-pos-1";
  name = "ask for the state of all child sessions";
  skill = "children-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "You are the manager session of this swarm. What state are the child sessions in — which are done, which are still working and which wait for me?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `children-status` for this request? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `children-status`.",
    critical: true,
  }];
}();
