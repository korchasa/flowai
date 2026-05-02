import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-ai-ide-runner (cross-IDE/model fan-out — superficially
// similar because it touches model choice, but it executes prompts, not cost analysis).
export const AnalyzeContextTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-adj-2";
  name = "run prompt across models (adjacent)";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Send this same prompt to Claude Code and to Codex CLI and compare what each one returns verbatim.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
