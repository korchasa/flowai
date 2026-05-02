import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: invoking an existing command's behavior is not the same as authoring
// or updating a command definition.
export const EngineerCommandTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-false-3";
  name = "running a command (false-use)";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run our standard commit workflow on the staged changes — review them and produce the commit message.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
