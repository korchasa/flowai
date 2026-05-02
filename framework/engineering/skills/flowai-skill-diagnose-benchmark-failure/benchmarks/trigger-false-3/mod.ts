import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("benchmark") but the user means a perf
// benchmark with hyperfine — nothing to do with flowai's scenario artifacts.
export const DiagnoseBenchmarkFailureTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-false-3";
  name = "performance benchmark numbers";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me set up a hyperfine performance benchmark for my CLI and decide whether the new build is faster than the old one.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
