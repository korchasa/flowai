import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: writing a NEW test from scratch is not the same as fixing a failing one.
export const FixTestsTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-false-2";
  name = "write a new test (false-use)";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I just added a slugify() helper. Write a couple of unit tests covering empty strings, unicode, and trailing whitespace.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
