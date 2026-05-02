import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AnalyzeContextTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-pos-1";
  name = "estimate session token cost";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How many tokens have we used so far in this conversation, and what is the rough dollar cost?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-analyze-context` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
