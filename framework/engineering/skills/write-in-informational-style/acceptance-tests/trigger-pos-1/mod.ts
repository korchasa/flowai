import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WriteInInformationalStyleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "write-in-informational-style-trigger-pos-1";
  name = "rewrite marketing copy as neutral";
  skill = "write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  noPositiveTrigger =
    "Measured 2026-08-20, 3 runs, every raw session with ZERO tool calls in 15 s: the agent rewrites the text on the spot, which is the fastest unaided answer of the whole trigger suite. Same shape as engineer-prompts-for-reasoning-trigger-pos-1 — a request the model believes it can answer unaided never reaches the catalog, so no description wording can win it.";

  userQuery =
    "Rewrite this product page so it reads as a neutral informational article — no marketing tone, no superlatives, just factual prose.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `write-in-informational-style` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `write-in-informational-style`.",
    critical: true,
  }];
}();
