import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False use: the words swarm and status in a question about a container cluster.
export const ChildrenStatusTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "children-status-trigger-false-1";
  name = "ask about a docker swarm cluster (false use)";
  skill = "children-status";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which command shows the status of the nodes in a Docker Swarm cluster? Answer in one line.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `children-status`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `children-status/SKILL.md` or calling the `Skill` tool with `children-status`.",
    critical: true,
  }];
}();
