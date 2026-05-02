import { BenchmarkSkillScenario } from "@bench/types.ts";

export const FixTestsTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-pos-2";
  name = "red CI suite query";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "CI is red. Three unit tests are failing in the auth package — please get them green.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-fix-tests` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
