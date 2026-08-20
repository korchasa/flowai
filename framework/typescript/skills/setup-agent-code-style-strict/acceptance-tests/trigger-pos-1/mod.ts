import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// KNOWN RED, and NOT a case for `noPositiveTrigger`. Measured 2026-08-20,
// 3 runs, 0/3 — but the traces show 3-4 tool calls per run in 67 s: the agent
// edits AGENTS.md itself with generic tools instead of invoking this skill. That is a
// routing miss with a live tool path, not the "answers unaided in one breath"
// shape that retires a positive trigger, so a description rewrite is still the
// lever here and the scenario stays red until someone pulls it.
export const TsStrictStyleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "setup-agent-code-style-strict-trigger-pos-1";
  name = "add strict TS rules to AGENTS.md";
  skill = "setup-agent-code-style-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We run TypeScript with `strict: true` on Node. Add the strict-mode code-style rules to AGENTS.md so the assistant follows them.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `setup-agent-code-style-strict` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `setup-agent-code-style-strict`.",
    critical: true,
  }];
}();
