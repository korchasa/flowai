import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: session goals are the topic, but the user wants new goals written, not delivered ones checked.
export const CheckGoalsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "check-goals-trigger-false-1";
  name = "sets goals for a future session";
  skill = "check-goals";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Write down three goals for our next session about the parser refactor. Just list them, don't check anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `check-goals`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `check-goals/SKILL.md` or calling the `Skill` tool with `check-goals`.",
    critical: true,
  }];
}();
