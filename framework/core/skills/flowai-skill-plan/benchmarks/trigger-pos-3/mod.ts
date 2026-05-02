import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-pos-3";
  name = "task breakdown for refactor";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Plan the upcoming repository-pattern refactor as a task with goal, current state, constraints, DoD, and a step-by-step solution. I'll review before we start.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan`.",
    critical: true,
  }];
}();
