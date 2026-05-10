import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: shell command vocabulary, not a flowai command-authoring task.
export const EngineerCommandTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-false-1";
  name = "shell one-liner request";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write me a one-liner shell command that finds the 10 largest files under ./src and prints them sorted by size.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
