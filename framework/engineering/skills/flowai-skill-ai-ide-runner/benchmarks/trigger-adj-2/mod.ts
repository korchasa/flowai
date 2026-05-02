import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-analyze-context (token usage/cost estimation for
// the current session — different from cross-IDE prompt execution).
export const AiIdeRunnerTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-adj-2";
  name = "context cost analysis (adjacent)";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How many tokens is this conversation eating right now, and what would it cost on Sonnet versus Haiku?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
