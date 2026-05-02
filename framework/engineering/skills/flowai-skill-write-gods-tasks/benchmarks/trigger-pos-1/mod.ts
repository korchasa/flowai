import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteGodsTasksTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-pos-1";
  name = "GODS-format task draft";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to write up tomorrow's work in our usual GODS format — goal, overview, DoD, solution. Help me structure it properly.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-gods-tasks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
