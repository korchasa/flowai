import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DeepResearchTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "deep-research-trigger-pos-1";
  name = "evidence-backed market research";
  skill = "deep-research";
  // KNOWN RED — do NOT "fix" by raising the cap again. Measured 2026-08-16 at
  // the default 900_000 ms cap: 0/5, exit 124 every run. Re-measured 2026-08-19
  // at 1_800_000 ms: still 0/3, still exit 124, and the deterministic scorer
  // saw ZERO tool calls in all three traces. Doubling the budget changed
  // nothing, so the cap is not the cause and the run is not a long research
  // pass — the agent produces no tool call at all before the kill. Diagnose the
  // hang from a raw session before touching this scenario again.
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a thorough evidence-backed analysis of the current vector database landscape with cited sources and a written summary.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `deep-research` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `deep-research`.",
    critical: true,
  }];
}();
