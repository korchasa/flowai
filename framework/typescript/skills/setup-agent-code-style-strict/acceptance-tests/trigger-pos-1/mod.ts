import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Was 0/3 on 2026-08-20 with 3-4 tool calls per run: the agent wrote its own
// rules into AGENTS.md instead of invoking this skill, which carries the rule
// text. Notable because the old description matched this query almost verbatim
// and still lost — a "Use when the user asks to..." opener describes the
// occasion but never says what the skill produces. Rewritten action-first on the
// same day, naming the artefact and stating the rule text ships inside the skill.
// That moved it from 0/3 to 1/3, no further. In the two losing runs the agent
// reads AGENTS.md, writes its own rules and reports `review_ready` in ~50 s.
// Still open.
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
