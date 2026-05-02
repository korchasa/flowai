import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-hook (event-driven script, not a
// delegated subagent).
export const EngineerSubagentTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-adj-3";
  name = "event hook (adjacent)";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Whenever the agent is about to commit, I want a script to run our linter and reject the action if it fails. Wire that up.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
