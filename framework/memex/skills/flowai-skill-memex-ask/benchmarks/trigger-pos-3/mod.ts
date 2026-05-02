import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexAskTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-pos-3";
  name = "answer from stored notes with citations";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Pull the answer from our stored notes, not from training data: who owns the auth service and what are the open risks they flagged?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-ask` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
