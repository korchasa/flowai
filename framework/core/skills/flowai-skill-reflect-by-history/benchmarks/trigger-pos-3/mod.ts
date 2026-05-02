import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectByHistoryTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-pos-3";
  name = "cross-session pattern hunt";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Mine all my prior session logs for patterns where I keep correcting the agent the same way. Suggest hooks or rule updates to prevent it.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-reflect-by-history` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
