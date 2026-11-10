import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: children-status (the state of children that already run).
export const StartChildTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "start-child-trigger-adj-1";
  name = "ask for the state of the child sessions (adjacent)";
  skill = "start-child";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What state are the child sessions of this swarm in — which are done and which wait for me?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `start-child`? For this query the skill is not appropriate; the agent should either invoke a different skill (such as `children-status`) or respond directly without reading `start-child/SKILL.md` or calling the `Skill` tool with `start-child`.",
    critical: true,
  }];
}();
