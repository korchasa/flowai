import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WritePrdTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-pos-2";
  name = "product requirements doc for onboarding";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a full PRD for a redesigned onboarding flow: who it's for, what problems it solves, scope, out of scope, and how we'll measure success.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-prd` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
