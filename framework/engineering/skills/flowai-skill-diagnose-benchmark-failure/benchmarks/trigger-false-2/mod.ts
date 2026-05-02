import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta documentation request about the taxonomy itself — describe,
// don't diagnose.
export const DiagnoseBenchmarkFailureTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-diagnose-benchmark-failure-trigger-false-2";
  name = "explain the taxonomy in docs";
  skill = "flowai-skill-diagnose-benchmark-failure";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "For our internal docs, can you describe the categories of benchmark failure flowai recognizes — no specific run, just the taxonomy.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-diagnose-benchmark-failure`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-diagnose-benchmark-failure/SKILL.md` or calling the `Skill` tool with `flowai-skill-diagnose-benchmark-failure`.",
    critical: true,
  }];
}();
