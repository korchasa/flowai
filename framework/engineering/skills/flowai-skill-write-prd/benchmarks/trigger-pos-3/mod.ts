import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WritePrdTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-pos-3";
  name = "spec a product feature for stakeholders";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a stakeholder-ready spec for the new analytics dashboard — problem statement, target users, requirements, and rollout plan.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-prd` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
