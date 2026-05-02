import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-jit-review (catches hidden regressions in a diff;
// not the same as fixing a test that is already failing).
export const FixTestsTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-adj-1";
  name = "JIT review query (adjacent)";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Tests are green, but I want you to scan my staged diff for hidden regressions before I commit.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
