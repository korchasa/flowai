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
   * KNOWN RED — and not for want of trying. Three sweeps of three runs on
   * 2026-08-19/20, nine raw sessions, ZERO tool calls in every one: the agent
   * writes the prompt itself in its first breath and never lists the skill
   * catalog at all. Two description rewrites were measured against it — an
   * action-first form ("Write or fix a prompt ... producing it IS the work"),
   * then the same plus the user's own verb `structure` — and neither moved it
   * off 0/3, while the SAME action-first rewrite took the sibling
   * `engineer-prompts-for-instant` from 1/3 to 2/3.
   *
   * So the lever is not the description. The failure is the general one this
   * project keeps meeting: a request the model believes it can answer in one
   * breath never reaches the catalog, and no wording inside a skill it never
   * reads can change that. Do NOT "fix" this by hinting in the query — that is
   * test-fitting. It belongs with the other scenarios where the agent solves
   * the task unaided, and it needs a decision about what a positive trigger
   * means for capabilities the model already believes it has.
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
