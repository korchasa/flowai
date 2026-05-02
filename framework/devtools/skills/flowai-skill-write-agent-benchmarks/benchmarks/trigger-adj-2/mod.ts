import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-diagnose-benchmark-failure (a benchmark already
// failed and needs investigation, not authoring a new one).
export const WriteAgentBenchmarksTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-adj-2";
  name = "diagnose failing benchmark (adjacent)";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "One of my scenarios just dropped from passing to failing in the latest run. Look at the run artifacts and tell me why before I touch the SKILL.md.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-agent-benchmarks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-agent-benchmarks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
