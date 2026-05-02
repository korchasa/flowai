import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexSaveTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-pos-3";
  name = "file a local document into the memex";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Take `~/Downloads/onboarding-runbook.md` and file it into our project memex so future sessions can find it — keep the original verbatim too.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-save` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
