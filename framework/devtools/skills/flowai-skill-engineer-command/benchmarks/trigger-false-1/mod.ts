import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the command-authoring workflow works,
// not a request to author one.
export const EngineerCommandTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-false-1";
  name = "meta question about commands";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the difference between a command and a skill in flowai's setup, and when does each get auto-invoked?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-command`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-command/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
