import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DeepResearchTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-pos-3";
  name = "executive summary with sources";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Produce an executive summary plus a longer markdown report on EU AI Act compliance, scoring sources and verifying each claim.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deep-research` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
