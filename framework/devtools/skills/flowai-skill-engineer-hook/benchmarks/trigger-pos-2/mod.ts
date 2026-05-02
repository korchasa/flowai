import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerHookTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-pos-2";
  name = "block dangerous commands";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a safety net that blocks the agent from running rm -rf or git push --force without an explicit confirmation. Set that up.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-hook` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
