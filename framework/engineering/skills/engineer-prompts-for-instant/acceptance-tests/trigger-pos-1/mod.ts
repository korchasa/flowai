import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPromptsForInstantTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-prompts-for-instant-trigger-pos-1";
  name = "stable prompt for haiku";
  skill = "engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  /**
   * The model here is deliberately NOT an Anthropic one. This skill is about
   * fast/reasoning models as a family — its own description names Gemini
   * Flash, GPT-4o Mini and Haiku alike — but Claude Code ships a `claude-api`
   * skill whose trigger fires on any mention of Claude, and it is a reference
   * for model ids, pricing and parameters rather than prompt structure. A
   * five-run series on 2026-08-16 scored 0/5 with `claude-api` taking every
   * run. Naming a non-Anthropic model removes that hook and lets the scenario
   * measure this skill's description instead of the host's.
   *
   * Re-measured 2026-08-19 with this wording: 1/3, and the two failures show
   * ZERO tool calls in 29–34 s. So the collision is gone and a second, separate
   * problem is now visible — the agent answers the prompt-writing request in
   * prose and never reaches for a skill at all. Rewording the query will not
   * fix that; the skill's own description has to make the agent want it.
   */
  userQuery =
    "Help me write a stable, predictable prompt for Gemini Flash that classifies support tickets into three buckets.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-prompts-for-instant` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
