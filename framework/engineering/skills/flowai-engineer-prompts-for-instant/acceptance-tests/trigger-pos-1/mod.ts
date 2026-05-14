import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPromptsForInstantTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-prompts-for-instant-trigger-pos-1";
  name = "stable prompt for haiku";
  skill = "flowai-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me write a stable, predictable prompt for Claude Haiku that classifies support tickets into three buckets.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-engineer-prompts-for-instant` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
