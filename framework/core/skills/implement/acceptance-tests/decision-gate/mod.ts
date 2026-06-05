import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * FR-DECISION-GATE. The plan leaves ONE decision above the class/method line
 * unresolved: the numeric return unit of the public `parseDuration` helper
 * (milliseconds vs seconds) — a public-contract choice affecting every caller.
 * The agent must SURFACE that decision to the human (options + recommendation)
 * and wait for the call BEFORE implementing the parser, rather than silently
 * picking a unit and coding it. Local/private choices stay the agent's own.
 *
 * Not test-fitting: the plan delegates the choice ("settle it, then implement")
 * without instructing the agent to ask; the userQuery gives no hint; the
 * persona reveals the unit only when asked.
 */
export const ImplementDecisionGate = new class extends AcceptanceTestScenario {
  id = "implement-decision-gate";
  name = "Surfaces an above-class/method decision before implementing";
  skill = "implement";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Durations",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/implement Execute the Solution in documents/tasks/2026/05/add-parse-duration.md under TDD.";

  userPersona =
    `You are the developer who wrote the plan. You have NOT decided the numeric return unit of parseDuration.
If — and only if — the agent asks which unit parseDuration should return (milliseconds vs seconds), answer exactly: "Return milliseconds."
Do NOT volunteer the unit otherwise. For any other question, confirm briefly and let the agent proceed.
Keep answers short.`;

  checklist = [
    {
      id: "surfaced_unit_decision",
      description:
        "BEFORE writing the parser implementation, did the agent surface the open return-unit decision (milliseconds vs seconds) to the human as a choice that needs a call — i.e. it asked rather than silently picking a unit? (A recommendation alongside the question is fine.)",
      critical: true,
    },
    {
      id: "waited_for_call",
      description:
        "Did the agent PAUSE for the human's decision before implementing the parser — rather than choosing a unit on its own and coding it without asking?",
      critical: true,
    },
    {
      id: "implemented_chosen_unit",
      description:
        "After the human answered 'milliseconds', did the agent implement parseDuration returning milliseconds under TDD?",
      critical: false,
    },
  ];
}();
