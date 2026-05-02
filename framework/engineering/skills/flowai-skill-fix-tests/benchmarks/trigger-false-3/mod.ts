import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: speeding up the test suite is a perf/infra task, not a fix-tests task.
export const FixTestsTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-false-3";
  name = "speed up test suite (false-use)";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our test suite takes 12 minutes. Help me find what's slow and parallelize the runner.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
