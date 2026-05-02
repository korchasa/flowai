import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-subagent (creating a task-specific subagent,
// not a user-invoked slash command).
export const EngineerCommandTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-adj-2";
  name = "subagent setup (adjacent)";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a dedicated code-reviewer agent that the main assistant can hand off to whenever I ask for a security pass. Help me set that up.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
