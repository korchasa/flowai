import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-reflect-by-history (analyzes past sessions across
// transcripts — historical, not the current live session's context).
export const AnalyzeContextTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-adj-3";
  name = "review past sessions (adjacent)";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Look across my past few weeks of IDE transcripts and surface recurring patterns I should fix in my rules.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
