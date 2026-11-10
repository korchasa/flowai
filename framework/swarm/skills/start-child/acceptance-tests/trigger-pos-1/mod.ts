import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: the manager is asked to start a child session for one part of its task.
export const StartChildTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "start-child-trigger-pos-1";
  name = "ask the manager to start a child session";
  skill = "start-child";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "You are the manager session of this task. Start a child session for the search-index part and keep it in the swarm section of your task file.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `start-child` for this request? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `start-child`.",
    critical: true,
  }];
}();
