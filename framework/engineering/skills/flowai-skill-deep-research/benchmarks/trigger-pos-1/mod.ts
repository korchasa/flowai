import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DeepResearchTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-pos-1";
  name = "evidence-backed market research";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a thorough evidence-backed analysis of the current vector database landscape with cited sources and a written summary.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deep-research` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
