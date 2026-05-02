import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-pos-2";
  name = "produce critiqued strategy";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I'd like a critiqued implementation strategy for adding pagination to the search API — variants with pros/cons before I pick one. Save it as a task file.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan`.",
    critical: true,
  }];
}();
