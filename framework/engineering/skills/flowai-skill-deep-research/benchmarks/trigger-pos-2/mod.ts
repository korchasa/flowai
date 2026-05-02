import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DeepResearchTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-pos-2";
  name = "comparative literature review";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Spawn parallel sub-agents and write me a comparative literature review of mixture-of-experts versus dense models with verified citations.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deep-research` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
