import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Surface-scout dispatch discipline (loop5, FR-PLAN-OUTCOME-COMPLETENESS).
 *
 * Unlike the sibling `plan-dod-covers-stated-outcomes` (which tests the INLINE
 * enumeration + DoD seeding and is a regression guard), this scenario gates on
 * the STRUCTURAL mechanism added by the surface-scout change, none of which
 * exists in the pre-change atom:
 * - a `surface-scout` subagent dispatch visible in the tool trace;
 * - an `### Affected Surface` subsection under `## Overview` of the task file
 *   (the durable artifact plan-critic and review recompute the set-diff from —
 *   loop5 critic round 3, user decision 2026-07-05);
 * - plain-bullet disposition rows (checkbox syntax would corrupt
 *   deriveStatusFromDoD — loop5 critic round 2 objection 3).
 *
 * This scenario checks that the dispatch HAPPENS and that the surface content
 * lands. Whether the planner actually consumed what the scout returned is a
 * separate question with its own scenario, `plan-uses-scout-findings` — the
 * split exists because the two failure modes are independent and because
 * requiring the scout's verbatim text here produced a FALSE PASS: subagent
 * dispatch is asynchronous, the call returns only `agentId` plus usage
 * counters (172 bytes, measured 2026-08-11 in two runs), so any "verbatim
 * block" the planner writes at that point cannot have been copied from the
 * scout. The judge accepted such a block once and rejected an identical
 * situation in the next run.
 *
 * The fixture plants a duplicated truncation implementation in the Slack
 * notifier that the request does not mention (parallel-file class: mirrors
 * sphinx-7462 / pylint-4551). Finding it inline is easy in a small fixture —
 * the RED anchor is the dispatch + persisted artifact, not the discovery.
 */
export const PlanAffectedSurfaceScoutBench = new class
  extends AcceptanceTestScenario {
  id = "plan-affected-surface-scout";
  name = "Plan dispatches surface-scout and persists the affected surface";
  skill = "plan";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Bug report: email notification subjects cut multi-byte emoji in half. Product spec: " +
    "(1) subject truncation must respect grapheme boundaries (never split a surrogate pair); " +
    "(2) every truncated subject must end with the single ellipsis character '…'. " +
    "Currently emails show broken characters like '\\uD83D' at the cut point. Plan the fix.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write a task file in the 'documents/tasks/' directory?",
      critical: true,
    },
    {
      id: "scout_subagent_dispatched",
      description:
        "Does the tool-call trace show the agent dispatching a SUBAGENT named 'surface-scout' (e.g. a Task/Agent tool invocation whose agent type, name, or prompt explicitly targets surface-scout)? Inline grep/search by the main agent does NOT count — there must be a subagent dispatch.",
      critical: true,
    },
    {
      id: "surface_section_persisted",
      description:
        "Does the task file contain an '### Affected Surface' subsection under '## Overview' holding the enumerated surface? Judge the SECTION's presence and content only — do NOT require the scout's raw text to be quoted verbatim, and do NOT fail this item because the content came from the agent's own enumeration.",
      critical: true,
    },
    {
      id: "disposition_rows_plain_bullets",
      description:
        "Does the '### Affected Surface' subsection contain a per-item disposition list where each surface item is a PLAIN bullet ('- item — disposition') carrying one of: covered-by <step/DoD ref>, 'not affected' with cited inspected evidence, or 'deferred — human choice'? Checkbox bullets ('- [ ]' / '- [x]') in this subsection are a FAIL.",
      critical: true,
    },
    {
      id: "parallel_site_in_table",
      description:
        "Does the affected-surface content (scout block or disposition table) include the duplicated truncation logic in src/notify/slack_notifier.ts — a parallel site the request never mentions?",
      critical: true,
    },
    {
      id: "no_fix_site_leak_to_scout",
      description:
        "When dispatching the scout, did the agent pass the user's request/symptom description WITHOUT pre-naming its own chosen fix file or preferred variant in the dispatch prompt? (The dispatch prompt may contain the request text and repo pointers; it must not say 'the fix goes in email_notifier.ts' or equivalent.)",
      critical: false,
    },
  ];
}();
