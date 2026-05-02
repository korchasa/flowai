import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerRuleTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-pos-3";
  name = "rules placement question";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Where should I write down our team conventions so the assistant picks them up automatically across Cursor and Claude Code?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-rule` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
