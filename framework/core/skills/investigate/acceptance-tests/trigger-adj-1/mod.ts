import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// A concrete failing test with the cause already named: fix it directly, no
// controlled investigation needed. There is no neighbouring skill to defer to —
// `fix-tests` was deleted on 2026-08-27 after nine runs showed the model repairs
// a red test unaided — so the passing answer here is the agent doing the repair
// itself without loading `investigate`.
export const InvestigateTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "investigate-trigger-adj-1";
  name = "fix a known failing test (adjacent)";
  skill = "investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "test_user_signup is failing because the seed user already exists in the fixture — please fix the test.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `investigate/SKILL.md` or calling the `Skill` tool with `investigate`.",
    critical: true,
  }];
}();
