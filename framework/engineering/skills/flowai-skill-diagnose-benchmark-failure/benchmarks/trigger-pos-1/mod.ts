import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DiagnoseBenchmarkFailureTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-pos-1";
  name = "diagnose failed benchmark scenario";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "A benchmark scenario just failed in the latest run — read the artifacts and tell me what category of failure it is before I touch anything.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-diagnose-benchmark-failure` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
