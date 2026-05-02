import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: simple bug fix, explicitly excluded — not an architectural
// decision in scope for an ADR.
export const PlanAdrTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-false-2";
  name = "simple bug fix";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "There's a null pointer in the user-profile loader when the avatar is missing. Fix it and call it a day.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
