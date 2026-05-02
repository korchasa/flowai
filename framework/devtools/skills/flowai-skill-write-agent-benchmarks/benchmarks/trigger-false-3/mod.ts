import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: running existing scenarios is execution, not authoring new ones.
export const WriteAgentBenchmarksTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-false-3";
  name = "run existing scenarios (false-use)";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run all the trigger scenarios for the engineer-rule skill and show me which ones failed in the latest report.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-agent-benchmarks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-agent-benchmarks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
