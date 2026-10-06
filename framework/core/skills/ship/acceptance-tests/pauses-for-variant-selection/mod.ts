import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Plan → Implement gate. The user invokes /ship but DECLINES variant
 * selection ("none of these, let me rethink"). The agent must STOP at the
 * Plan → Implement gate without entering Implement Phase, and must NOT
 * touch the working tree beyond the Plan Phase's allowed artefacts.
 */
export const ShipPausesForVariantSelection = new class
  extends AcceptanceTestScenario {
  id = "ship-pauses-for-variant-selection";
  name = "STOPs at Plan → Implement gate when user declines variants";
  skill = "ship";
  maxSteps = 30;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery = "/ship Add a trim helper to strings.ts";

  userPersona =
    `You are a developer who started /ship but changes your mind during variant selection.
When the agent presents Plan-Phase variants, reply "None of these match — let me rethink. Please STOP."
Do not provide further input.`;

  checklist = [
    {
      // Until 2026-08-22 this demanded "at least 2 implementation variants",
      // which the Plan Phase's own text forbids for this task: it offers one
      // variant "when the task has an obvious path (e.g., 'create a text
      // file', 'add a config line') with no meaningful trade-offs", and a trim
      // helper is that. The run it failed presented `Variant A — full scope`
      // and said why alternatives did not apply — the exception, applied
      // correctly. The subject of this scenario is the STOP at the gate; the
      // variants only have to exist for the user to decline. A scenario that
      // measures the two-variant rule needs a task with real trade-offs, and
      // it is not this one.
      id: "variants_presented",
      description:
        "Did the Plan Phase present implementation variant(s) in chat and ask the user to choose? One variant is acceptable when the agent states why alternatives do not apply — this item checks that a choice was offered, not how many options it held.",
      critical: true,
    },
    {
      id: "stopped_at_gate",
      description:
        "After the user declined variant selection, did the agent STOP without entering the Implement Phase? Look for the absence of any Implement-Phase RED/GREEN/CHECK steps in the trace AND a STOP/abort message acknowledging the decline.",
      critical: true,
    },
    {
      id: "no_implementation_changes",
      description:
        "Inspect the working tree after the agent stops. There must be NO source-code changes (no edits to `strings.ts` etc.). Only the Plan-Phase task file under `documents/tasks/` is allowed.",
      critical: true,
    },
  ];
}();
