import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DiagnoseBenchmarkFailureTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-pos-3";
  name = "evidence report before edits";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Before I edit the SKILL.md, give me an evidence-grounded report on why the latest run produced a low checklist score.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-diagnose-benchmark-failure` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
