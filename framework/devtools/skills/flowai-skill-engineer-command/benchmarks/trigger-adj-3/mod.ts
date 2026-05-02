import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-hook (event hook/plugin, not a user-invoked
// command).
export const EngineerCommandTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-adj-3";
  name = "event hook setup (adjacent)";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Every time the agent finishes editing a file, I want a script to auto-run prettier. Set that up so it triggers automatically.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
