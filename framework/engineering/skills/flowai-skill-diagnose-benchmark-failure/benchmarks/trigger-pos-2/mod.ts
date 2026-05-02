import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DiagnoseBenchmarkFailureTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-pos-2";
  name = "classify failure from artifacts";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Pull up judge-evidence.md and the scenario mod.ts for the run that just failed and classify the cause without proposing a fix yet.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-diagnose-benchmark-failure` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
