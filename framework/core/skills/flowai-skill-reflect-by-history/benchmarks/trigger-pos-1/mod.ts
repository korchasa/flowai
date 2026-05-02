import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectByHistoryTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-pos-1";
  name = "review past sessions";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Go through my past Claude Code sessions on this project and find recurring patterns I should fix in our skills, hooks, or rules.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-reflect-by-history` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
