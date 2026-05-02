import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: brief design discussion, explicitly excluded — not a request to
// produce a planning artifact in documents/tasks/.
export const PlanTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-false-3";
  name = "ad-hoc design suggestion";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quick suggestion: should we put the retry logic in the HTTP client or in the caller? One-paragraph answer is fine.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
