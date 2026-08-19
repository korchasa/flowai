import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPromptsForReasoningTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-prompts-for-reasoning-trigger-pos-1";
  name = "structured prompt for a reasoning model";
  skill = "engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  /**
   * The model here is deliberately NOT an Anthropic one. This skill is about
   * reasoning models as a family, not about Claude — but Claude Code ships a
   * `claude-api` skill whose trigger fires on any mention of Claude, and it is
   * a reference for model ids, pricing and parameters rather than prompt
   * structure. A five-run series on 2026-08-16 scored 0/5 with `claude-api`
   * taking every run. Naming a non-Anthropic model removes that hook and lets
   * the scenario measure this skill's description instead of the host's.
   *
   * KNOWN RED. Re-measured 2026-08-19 with this wording: 0/3, every run with
   * ZERO tool calls in 36–40 s. The collision is gone and a second, separate
   * problem is now visible — the agent answers the prompt-writing request in
   * prose and never reaches for a skill at all. Rewording the query will not
   * fix that; the skill's own description has to make the agent want it.
   */
  userQuery =
    "Help me structure a prompt for Gemini Pro so it can work through a multi-step contract review with full context.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-prompts-for-reasoning` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
