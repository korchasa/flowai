import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the skill's mechanics, not a request to fix a test.
export const FixTestsTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-false-1";
  name = "meta question about the skill";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does the fix-tests workflow generally cover, and when would I avoid using it?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
