import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrTriggerPos1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-pos-1";
  name = "explicit ADR request";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Please write an ADR for our choice of pgvector over Pinecone — record the chosen path, the alternatives we rejected, and the rationale.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-plan-adr` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
