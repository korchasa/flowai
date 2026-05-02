import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match ("ADR") but the user wants to read existing
// ADRs, not author a new one.
export const PlanAdrTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-false-3";
  name = "summarize existing ADRs";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "List the ADRs we already have in documents/adr/ and give me a one-line summary of each.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
