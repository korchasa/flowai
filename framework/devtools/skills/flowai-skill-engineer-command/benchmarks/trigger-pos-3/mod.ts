import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerCommandTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-pos-3";
  name = "update existing command";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our /flowai-commit command needs an extra step that checks the changelog. Update it so the workflow stays consistent across IDEs.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-command` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
