import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EpicTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-pos-2";
  name = "large feature spanning sessions";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Auth rewrite is too big for one session. Lay it out as an epic with dependency-ordered phases and atomic tasks per phase.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-epic` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-epic`.",
    critical: true,
  }];
}();
