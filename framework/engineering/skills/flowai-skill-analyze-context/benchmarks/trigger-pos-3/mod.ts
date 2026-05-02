import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AnalyzeContextTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-pos-3";
  name = "break down active rules cost";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Break down which active rules and skill descriptions are loaded right now and how much each one is costing per turn.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-analyze-context` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
