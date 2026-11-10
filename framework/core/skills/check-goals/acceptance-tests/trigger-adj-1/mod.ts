import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: reflect — the user wants a critique of HOW the agent worked, not a check of WHAT was delivered.
export const CheckGoalsTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "check-goals-trigger-adj-1";
  name = "session process retrospective (adjacent)";
  skill = "check-goals";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Reflect on this session: where did your process go wrong, and which of the project's rules should we tighten because of it?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `check-goals`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `check-goals/SKILL.md` or calling the `Skill` tool with `check-goals`.",
    critical: true,
  }];
}();
