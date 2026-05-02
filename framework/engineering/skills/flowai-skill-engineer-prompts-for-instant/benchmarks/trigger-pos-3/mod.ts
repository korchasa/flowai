import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerPromptsForInstantTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-pos-3";
  name = "beginner-friendly fast-model prompt";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I am new to prompting and I just need GPT-4o Mini to format JSON consistently — walk me through writing a stable instruction.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-prompts-for-instant` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
