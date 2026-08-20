import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// KNOWN RED, and NOT a case for `noPositiveTrigger`. Measured 2026-08-20,
// 3 runs, 0/3 — but the traces show 2-5 tool calls per run in 26 s: the agent
// runs `deno test` itself with generic tools instead of invoking this skill. That is a
// routing miss with a live tool path, not the "answers unaided in one breath"
// shape that retires a positive trigger, so a description rewrite is still the
// lever here and the scenario stays red until someone pulls it.
export const DenoCliTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "cli-trigger-pos-1";
  name = "natural deno test invocation";
  skill = "cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run the unit tests in this project and tell me which ones fail. It's a Deno project.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `cli` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `cli`.",
    critical: true,
  }];
}();
