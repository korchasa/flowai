import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-reflect (current-session reflection covers process,
// decisions, and lessons — broader than pure token/cost accounting).
export const AnalyzeContextTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-adj-1";
  name = "session reflection (adjacent)";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Reflect on how this session went — what worked, what dragged, and what we should do differently next time.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
