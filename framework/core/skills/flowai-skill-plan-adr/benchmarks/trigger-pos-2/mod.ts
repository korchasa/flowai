import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-pos-2";
  name = "capture rationale persistently";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Capture our rationale for picking event-sourcing over CRUD for the order service so future contributors don't relitigate the decision.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan-adr` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
