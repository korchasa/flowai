import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: trivial choice, explicitly excluded — ADRs are reserved for
// architectural decisions worth persisting, not bikeshedding.
export const PlanAdrTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-false-1";
  name = "trivial choice not worth ADR";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Should I use single quotes or double quotes for strings in this TS project? Just pick one for me.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
