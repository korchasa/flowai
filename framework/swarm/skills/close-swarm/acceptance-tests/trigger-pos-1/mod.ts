import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: the manager is asked to close its finished children.
export const CloseSwarmTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "close-swarm-trigger-pos-1";
  name = "ask the manager to close the swarm";
  skill = "close-swarm";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "You are the manager session of this swarm and the children have finished. Close the swarm: collect their follow-ups, settle the branches and worktrees, and archive the child sessions.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `close-swarm` for this request? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `close-swarm`.",
    critical: true,
  }];
}();
