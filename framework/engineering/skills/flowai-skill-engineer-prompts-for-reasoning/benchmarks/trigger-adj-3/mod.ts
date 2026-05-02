import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (the user actually wants the deep
// analysis itself, not a prompt that produces one).
export const EngineerPromptsForReasoningTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-adj-3";
  name = "produce the deep analysis (adjacent)";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a thorough cited investigation of recent agentic-coding benchmarks and synthesize a written report with sources.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
