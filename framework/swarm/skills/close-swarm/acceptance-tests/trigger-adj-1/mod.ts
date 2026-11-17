import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: finish-session (closing the current single session).
export const CloseSwarmTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "close-swarm-trigger-adj-1";
  name = "ask to finish the current session (adjacent)";
  skill = "close-swarm";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Finish this session: check that everything I asked for is delivered, then commit, push and archive it. It has no child sessions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `close-swarm`? For this query the skill is not appropriate; the agent should either invoke a different skill (such as `finish-session`) or respond directly without reading `close-swarm/SKILL.md` or calling the `Skill` tool with `close-swarm`.",
    critical: true,
  }];
}();
