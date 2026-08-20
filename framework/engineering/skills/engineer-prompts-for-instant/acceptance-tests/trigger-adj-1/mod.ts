import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: engineer-prompts-for-reasoning (target is a smart
// reasoning model — Gemini Pro, GPT-4o, Sonnet — different guidance).
//
// The model named here is deliberately NOT an Anthropic one, and the reason is
// harsher than the usual collision. Claude Code ships a `claude-api` skill that
// fires on any mention of Claude; it loads a large API reference, and on
// 2026-08-20 that ended the session with "Prompt is too long" and exit 1 in
// 2 runs of 3 — with routing itself correct, `skill_not_invoked` passing every
// time. The scenario was failing on a host skill exhausting the context window,
// not on anything this skill's description does.
export const EngineerPromptsForInstantTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-prompts-for-instant-trigger-adj-1";
  name = "prompt for reasoning model (adjacent)";
  skill = "engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a structured prompt for Gemini Pro so it can reason through a multi-step legal analysis with full context.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
