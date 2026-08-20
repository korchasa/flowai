import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// KNOWN RED, and NOT a case for `noPositiveTrigger`. Measured 2026-08-20,
// 3 runs, 0/3 — but the traces show 2-5 tool calls per run in 26 s: the agent
// reads the failing test and patches it with generic tools instead of invoking this skill. That is a
// routing miss with a live tool path, not the "answers unaided in one breath"
// shape that retires a positive trigger, so a description rewrite is still the
// lever here and the scenario stays red until someone pulls it.
export const FixTestsTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "fix-tests-trigger-pos-1";
  name = "natural failing-test query";
  skill = "fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "One of my tests started failing after my last refactor. Can you take a look and fix it?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `fix-tests` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `fix-tests`.",
    critical: true,
  }];
}();
