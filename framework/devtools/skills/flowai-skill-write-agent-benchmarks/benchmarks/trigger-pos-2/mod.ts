import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteAgentBenchmarksTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-pos-2";
  name = "evaluate agent performance";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to evaluate how reliably my code-reviewer agent catches a missing null check across a dozen test cases. Set up the evaluation harness.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-agent-benchmarks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
