import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DeepResearchTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "deep-research-trigger-pos-1";
  name = "evidence-backed market research";
  skill = "deep-research";
  // Not a routing failure, and never was. The raw session of 2026-08-20 shows
  // the agent calling `Skill` with `deep-research` on its first move, then
  // dispatching a `deep-research-worker` subagent that ran 101 turns of real
  // research until the cap killed it. The scenario failed for two reasons that
  // had nothing to do with the description:
  //
  //  1. `AcpAgent` snapshotted its tool calls in `run()`'s `finally`, which a
  //     timeout kill never reaches, so every timed-out run scored "0 tool
  //     call(s) observed" — and this one carried that verdict across two
  //     sweeps. The comment that used to sit here concluded from it that the
  //     agent never started, and told the next reader not to touch the cap.
  //  2. A routing checklist was scored on the exit code, so even a correct
  //     verdict lost to the clock.
  //
  // Both are fixed (`resolveToolCalls`, `shouldInjectExitCodeCheck`). The run
  // still exceeds the cap — real research does — and that is now allowed to be
  // irrelevant to what this scenario measures.
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
