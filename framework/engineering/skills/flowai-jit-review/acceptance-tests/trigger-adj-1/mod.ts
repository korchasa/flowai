import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-fix-tests (the user has a known failing test
// and wants it fixed; not a search for hidden regressions).
export const JitReviewTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-jit-review-trigger-adj-1";
  name = "fix a known failing test (adjacent)";
  skill = "flowai-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "test_user_signup is failing after my refactor — please get it green again without weakening the assertion.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-jit-review`.",
    critical: true,
  }];
}();
