import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match ("epic", "phases") but the user wants status of
// existing work, not creation of a new epic file.
export const EpicTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-false-3";
  name = "status of existing epic";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What phase of the billing epic are we currently in? Just summarize the status from existing tracking.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
