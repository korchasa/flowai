import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerCommandTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-trigger-pos-2";
  name = "extend flowai with workflow";
  skill = "flowai-skill-engineer-command";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me create a user-invoked flowai workflow that wraps our deploy script and asks for confirmation before pushing to prod.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-command` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-command`.",
    critical: true,
  }];
}();
