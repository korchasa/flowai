import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-pos-3";
  name = "broad maintenance sweep";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "It's been three months since I cleaned this project up. Do a maintenance sweep, list everything that needs attention, and fix things issue-by-issue with my approval.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-maintenance` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
