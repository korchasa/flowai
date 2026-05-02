import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta documentation question about the skill, not an actual run request.
export const AiIdeRunnerTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-false-1";
  name = "meta question about the runner";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain conceptually how cross-IDE prompt execution works in flowai — I am writing a blog post, not running anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
