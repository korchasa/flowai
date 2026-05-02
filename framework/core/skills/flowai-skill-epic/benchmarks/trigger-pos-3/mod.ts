import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EpicTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-pos-3";
  name = "produce documents/tasks/epic file";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Please produce documents/tasks/epic-billing-overhaul.md with phases, dependencies, and tracking — this work will run for several weeks.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-epic` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-epic`.",
    critical: true,
  }];
}();
