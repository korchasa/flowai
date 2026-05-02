import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteAgentBenchmarksTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-agent-benchmarks-trigger-pos-3";
  name = "set up testing infrastructure";
  skill = "flowai-skill-write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We don't have any infrastructure yet for measuring how well our skills behave. Help me bootstrap evidence-based scenarios with a judge and checklists.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-agent-benchmarks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-agent-benchmarks`.",
    critical: true,
  }];
}();
