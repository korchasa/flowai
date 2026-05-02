import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerPromptsForReasoningTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-pos-1";
  name = "structured prompt for sonnet";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me structure a prompt for Claude 3.5 Sonnet so it can work through a multi-step contract review with full context.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-prompts-for-reasoning` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
