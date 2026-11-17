import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False use: the word start in a request about a local process.
export const StartChildTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "start-child-trigger-false-1";
  name = "ask to start a dev server (false use)";
  skill = "start-child";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Start the dev server with `python3 -m http.server 8000` and tell me the address.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `start-child`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `start-child/SKILL.md` or calling the `Skill` tool with `start-child`.",
    critical: true,
  }];
}();
