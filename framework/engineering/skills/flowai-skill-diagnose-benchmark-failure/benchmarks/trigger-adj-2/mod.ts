import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-fix-tests (a unit test is failing — that is repair
// of a normal Deno/TS test, not analysis of a flowai benchmark run).
export const DiagnoseBenchmarkFailureTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-adj-2";
  name = "fix a regular unit test (adjacent)";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "One of my Deno unit tests started failing after I refactored the rate limiter — please find why and fix it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
