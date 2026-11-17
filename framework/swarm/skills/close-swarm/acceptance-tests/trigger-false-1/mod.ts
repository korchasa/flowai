import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False use: the word close in a request about a code defect.
export const CloseSwarmTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "close-swarm-trigger-false-1";
  name = "ask to close a file handle (false use)";
  skill = "close-swarm";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The function read_all in reader.py never closes the file it opens. Fix that with a `with` block.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `close-swarm`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `close-swarm/SKILL.md` or calling the `Skill` tool with `close-swarm`.",
    critical: true,
  }];
}();
