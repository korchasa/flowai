import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-review (review uncommitted changes before commit;
// not the same as fixing a failing test).
export const FixTestsTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-fix-tests-trigger-adj-3";
  name = "pre-commit review query (adjacent)";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I'm about to commit. Review what I have staged and tell me if anything is missing or sloppy.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
