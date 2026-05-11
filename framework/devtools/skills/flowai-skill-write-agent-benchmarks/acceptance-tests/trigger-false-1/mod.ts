import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary collision — performance benchmarking of code/hardware,
// not agent behavior benchmarks.
export const WriteAgentBenchmarksTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-false-1";
  name = "perf benchmark question (false-use)";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up a performance benchmark for our hot path JSON parser using deno bench so we can compare it across releases.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-agent-benchmarks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-agent-benchmarks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
