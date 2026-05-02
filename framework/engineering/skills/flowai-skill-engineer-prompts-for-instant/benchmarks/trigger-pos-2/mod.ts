import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerPromptsForInstantTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-pos-2";
  name = "fast model with tight latency";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I am running this against Gemini Flash with a tight latency budget — show me how to phrase the instruction so it never drifts.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-prompts-for-instant` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
