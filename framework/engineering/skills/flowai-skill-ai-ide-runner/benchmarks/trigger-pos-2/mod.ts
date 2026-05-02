import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AiIdeRunnerTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-pos-2";
  name = "compare two IDEs on same prompt";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to compare how Claude Code and Codex CLI handle this refactor prompt side by side.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-ai-ide-runner` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
