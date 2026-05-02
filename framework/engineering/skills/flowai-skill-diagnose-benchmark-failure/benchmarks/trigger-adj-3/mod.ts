import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (general bug root-cause analysis — not
// scoped to flowai benchmark artifacts/taxonomy).
export const DiagnoseBenchmarkFailureTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-adj-3";
  name = "general bug investigation (adjacent)";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Customers see intermittent timeouts on the upload endpoint — investigate hypothesis by hypothesis and recommend a fix.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
