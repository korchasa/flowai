import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerCommandTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-pos-1";
  name = "new slash command request";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a new slash command for our team that runs our standard release checklist. How do I set that up?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-command` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
