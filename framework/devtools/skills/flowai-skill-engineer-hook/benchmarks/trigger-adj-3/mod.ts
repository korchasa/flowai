import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-subagent (delegating to a specialized
// agent, not a script-driven hook).
export const EngineerHookTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-adj-3";
  name = "subagent delegation (adjacent)";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a separate test-writer agent that the main assistant can delegate to whenever it needs unit tests written. How do I configure that?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
