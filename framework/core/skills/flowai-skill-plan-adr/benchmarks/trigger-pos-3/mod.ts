import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-pos-3";
  name = "record this decision";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Record this decision: we're using AWS SQS instead of building our own queue. Document the alternatives we considered and why SQS won.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan-adr` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
