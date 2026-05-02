import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteGodsTasksTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-pos-2";
  name = "format guide for goal-overview-DoD-solution";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Show me how to fill out the goal, overview, definition of done, and solution sections for a small task — what goes where, with examples.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-gods-tasks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
