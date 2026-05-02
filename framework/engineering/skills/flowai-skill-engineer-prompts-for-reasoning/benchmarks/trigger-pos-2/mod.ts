import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerPromptsForReasoningTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-pos-2";
  name = "context-rich prompt for gpt-4o";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a context-rich prompt for GPT-4o that walks through architectural trade-offs and explains its reasoning step by step.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-prompts-for-reasoning` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
