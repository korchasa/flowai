import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectByHistoryTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-pos-2";
  name = "improve primitives from transcripts";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Use my historical IDE transcripts from the last month to surface concrete improvements to our project rules and skills.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-reflect-by-history` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
