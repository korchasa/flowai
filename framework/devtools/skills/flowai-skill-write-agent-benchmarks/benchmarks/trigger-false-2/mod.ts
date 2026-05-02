import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the benchmark runner works, not a request
// to author scenarios.
export const WriteAgentBenchmarksTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-false-2";
  name = "meta question about runner";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does the runner score scenarios under the hood, and what's the role of the LLM judge versus the deterministic checklist?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-agent-benchmarks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-agent-benchmarks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
