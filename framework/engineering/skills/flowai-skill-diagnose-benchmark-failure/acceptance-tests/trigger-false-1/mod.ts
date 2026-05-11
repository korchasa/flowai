import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: explicitly excluded by the description — passing benchmark, generic
// iteration request, no failure to diagnose.
export const DiagnoseBenchmarkFailureTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-false-1";
  name = "passing benchmark iteration";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "All my benchmarks are green — I just want to iterate on the wording of one SKILL.md to make it cleaner.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
