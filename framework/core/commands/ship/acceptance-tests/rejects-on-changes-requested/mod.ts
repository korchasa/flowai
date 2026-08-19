import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Verdict Gate. The Plan / Implement / Review phases all run, but the
 * Review verdict is `Request Changes` (the agent finds a critical issue —
 * e.g. the implementation introduces a `console.log` debug statement). The
 * composite MUST STOP at the verdict gate and NOT enter the Commit or
 * Push phases.
 *
 * The fixture biases the trace toward `Request Changes` by seeding a
 * leftover debug line in the planned change set.
 */
export const ShipRejectsOnChangesRequested = new class
  extends AcceptanceTestScenario {
  id = "ship-rejects-on-changes-requested";
  name = "STOPs at Verdict Gate on Request Changes";
  skill = "ship";
  maxSteps = 50;
  stepTimeoutMs = 540_000;
  // The default global cap is 900_000 ms — less than twice this scenario's own
  // step budget. Measured 2026-08-16/17: runs hit it at exactly 900.0 s on an
  // idle host at concurrency 2, i.e. the cap, not load.
  totalTimeoutMs = 1_800_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/ship Add a trim helper to strings.ts — leave a `console.log('called trim')` inside the implementation so I can see invocations in the demo.";

  userPersona =
    `You are a developer who explicitly asked for a debug log to be left in the implementation (this is the hygiene-fail you're testing).
When the Plan Phase asks for variant selection, pick the simplest one in one sentence.
When the Implement Phase reports results, acknowledge.
When the Review Phase produces its verdict, accept whatever the agent says (do NOT push back).
DO NOT explicitly type "Request Changes" — let the agent's review logic produce the verdict from the leftover debug log.`;

  checklist = [
    {
      id: "review_produced_non_approve",
      description:
        "Did the Review Phase emit a verdict that is NOT `Approve` — i.e. one of `Request Changes` / `Needs Discussion` (because of the `console.log` hygiene issue)?",
      critical: true,
    },
    {
      id: "stopped_before_commit",
      description:
        "After the non-Approve verdict, did the agent STOP without entering the Commit Phase? Inspect the trace for the absence of any `git commit` invocation and the absence of any Commit-Phase 'Documentation Sync' / 'Commit Grouping' execution.",
      critical: true,
    },
    {
      id: "no_push_attempted",
      description:
        "Inspect the trace for ANY `git push` command. There MUST be NONE.",
      critical: true,
    },
  ];
}();
