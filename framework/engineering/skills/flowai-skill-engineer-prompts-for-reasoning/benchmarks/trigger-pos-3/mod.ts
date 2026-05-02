import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerPromptsForReasoningTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-pos-3";
  name = "deep prompt for gemini pro";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Show me how to structure a deep, fully-contextual prompt for Gemini Pro to evaluate research papers and produce critique notes.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-prompts-for-reasoning` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
