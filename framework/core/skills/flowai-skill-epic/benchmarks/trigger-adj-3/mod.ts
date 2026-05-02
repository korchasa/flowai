import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-manage-github-tickets (creating GitHub issues
// from a plan, not building the multi-phase plan itself).
export const EpicTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-adj-3";
  name = "open GitHub issues (adjacent)";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open GitHub issues for the four tasks I just listed and add them to the v2.0 milestone.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
