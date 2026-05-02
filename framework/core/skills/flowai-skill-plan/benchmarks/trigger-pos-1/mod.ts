import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanTriggerPos1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-pos-1";
  name = "explicit plan request";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Before I start coding the new rate limiter, please plan the task properly — write the file under documents/tasks/ in GODS format with variants and DoD.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan`.",
    critical: true,
  }];
}();
