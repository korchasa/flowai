import { BenchmarkSkillScenario } from "@bench/types.ts";

export const FixTestsTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-pos-3";
  name = "specific assertion failure";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "test_user_login expects status 200 but it's returning 500 since I added the rate limiter. Make it pass without weakening the assertion.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-fix-tests` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
