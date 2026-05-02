import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: opinion / recommendation request about IDE choice — no runtime
// delegation needed; user wants conversational guidance.
export const AiIdeRunnerTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-false-3";
  name = "opinion on which IDE to adopt";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which AI IDE would you generally recommend for a small TypeScript team starting out — just your opinion, no benchmarks.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
