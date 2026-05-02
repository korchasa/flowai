import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-skill (authoring an agent-invocable skill,
// not a user-invoked command).
export const EngineerCommandTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-adj-1";
  name = "agent-invocable skill (adjacent)";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want the agent to automatically pick up a capability when it sees a Postgres migration file. Help me author that capability properly.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
