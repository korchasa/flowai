import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: a generic "check the project" request, explicitly excluded —
// the skill is reserved for the structured multi-category audit workflow.
export const MaintenanceTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-false-3";
  name = "generic check project";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quickly check the project — is it building and passing tests right now?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-maintenance/SKILL.md` or calling the `Skill` tool with `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
