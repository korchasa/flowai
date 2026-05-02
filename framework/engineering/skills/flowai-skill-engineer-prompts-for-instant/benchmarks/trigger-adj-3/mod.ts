import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-ai-ide-runner (the user wants to TEST prompts
// across IDEs/models, not write one for a fast model).
export const EngineerPromptsForInstantTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-adj-3";
  name = "test prompt across runtimes (adjacent)";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run my existing prompt through Codex CLI and OpenCode side by side so I can see how each runtime behaves.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
