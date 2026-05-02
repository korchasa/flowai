import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: single-file cleanup, explicitly excluded — no broad audit needed.
export const MaintenanceTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-false-2";
  name = "single file cleanup";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Clean up unused imports and dead variables in src/utils/format.ts. Just that one file.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-maintenance/SKILL.md` or calling the `Skill` tool with `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
