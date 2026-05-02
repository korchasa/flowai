import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-fix-tests (fixing concrete failing tests, not
// reviewing a diff for quality).
export const ReviewTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-adj-3";
  name = "fix failing tests in diff (adjacent)";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Three tests in users_test.ts are failing after my changes. Fix them so I can commit.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-review`.",
    critical: true,
  }];
}();
