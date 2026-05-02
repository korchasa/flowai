import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary collision — "command" here means a shell command, not a
// flowai user-invoked workflow.
export const EngineerCommandTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-false-2";
  name = "shell command help (false-use)";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the right shell command to find all files larger than 100MB in my home directory and list them sorted by size?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
