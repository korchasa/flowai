import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-jit-review (catch hidden regressions in a diff,
// not a broad project audit).
export const MaintenanceTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-adj-3";
  name = "JIT regression scan (adjacent)";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Tests pass on my branch but I'm worried about hidden regressions. Synthesize JIT tests against the diff to find them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-maintenance/SKILL.md` or calling the `Skill` tool with `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
