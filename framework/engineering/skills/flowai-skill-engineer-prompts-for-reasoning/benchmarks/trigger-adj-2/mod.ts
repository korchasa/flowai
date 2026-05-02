import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-subagent (build a subagent definition,
// not a prompt — uses prompt-engineering ideas but a different artifact).
export const EngineerPromptsForReasoningTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-adj-2";
  name = "build a subagent (adjacent)";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me design a dedicated code-reviewer subagent for my repo with its own scope, tools, and review checklist.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
