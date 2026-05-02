import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-agent-benchmarks (authoring NEW benchmark
// scenarios — different from diagnosing a run that already failed).
export const DiagnoseBenchmarkFailureTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-adj-1";
  name = "author new benchmark scenario (adjacent)";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me write a brand-new benchmark scenario for our prompt-engineering skill — set up the mod.ts and checklist from scratch.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
