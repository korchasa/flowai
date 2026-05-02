import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-setup-ai-ide-devcontainer (configures devcontainer
// for AI IDE tooling — install/setup, not runtime execution of prompts).
export const AiIdeRunnerTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-adj-3";
  name = "devcontainer setup (adjacent)";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a devcontainer to this repo so I can use Claude Code and OpenCode inside a sandboxed environment.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
