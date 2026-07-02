import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Models the dominant SWE-bench INCOMPLETE_FIX family (2026-07-02 run,
 * 9-10/11 failures): the request states a definite outcome set — including a
 * concrete expected literal — and the fixture contains a second, duplicated
 * formatting site (csv_export.ts) that the request does NOT mention: the
 * plan must discover it proactively (mirrors sphinx-7462, where one of two
 * duplicated `unparse` implementations was silently left unfixed).
 *
 * Covers atom edits #1-#3 (pre-gate: Step-2 surface enumeration, Step-3 DoD
 * seeding, Step-4 Cons transparency). The post-selection half (#3 Follow-ups
 * recording, #4 Step-7 completeness check) is covered by the sibling
 * `plan-records-dropped-outcomes` scenario, which supplies a simulated user.
 *
 * Failure modes this guards against, each observed in real sessions:
 * - DoD left as generic placeholders, stated outcomes never seeded
 *   (django-16667 invented its own output literal instead of the issue's
 *   "0-0-0"; pylint-4551 skipped the Optional-wrapping example);
 * - the duplicated second site silently missing from the plan
 *   (sphinx-7462 fixed one of two `unparse` copies);
 * - a variant silently narrower than the stated outcome set
 *   (django-13195/16256 dropped seen requirements as "out of ticket scope").
 *
 * RED mechanism: the pre-change atom writes DoD as "placeholder bullets —
 * fill in step 5a", and step 5a only runs after variant selection — which
 * this scenario never gives (no simulated user; plan stops at the variant
 * gate). So on the unchanged atom the task file plausibly carries no seeded
 * outcome coverage at the moment the session ends.
 */
export const PlanDodCoversStatedOutcomesBench = new class
  extends AcceptanceTestScenario {
  id = "plan-dod-covers-stated-outcomes";
  name = "Plan DoD - Covers Stated Outcomes and Affected Surface";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Bug report: report dates render wrong for edge-case values. Product spec says: " +
    "(1) any date outside the supported range (year < 1 or year > 9999) must render as the literal string \"0-0-0\"; " +
    "(2) a month value of 0 must fall back to 01. " +
    "Currently out-of-range values are rendered raw (e.g. year 12024 prints as '12024-05-03'). Plan the fix.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write a task file in the 'documents/tasks/' directory (as required by the planning process)?",
      critical: true,
    },
    {
      id: "dod_covers_each_stated_outcome",
      description:
        "Does the task file's `## Definition of Done` cover EACH of the two spec outcomes from the request — (a) out-of-range dates render \"0-0-0\", (b) month 0 falls back to 01 — either as separate bullets or explicitly collapsed with a stated single acceptance check? Generic bullets ('bug fixed', 'tests pass', 'edge cases handled') with no traceable per-outcome coverage do NOT count.",
      critical: true,
    },
    {
      id: "verbatim_literal_preserved",
      description:
        "Does the task file preserve the request's exact expected literal \"0-0-0\" (in the Definition of Done or Overview/Current State sections), rather than paraphrasing it (e.g. 'zeros', 'placeholder date', '0000-00-00', or an invented format)?",
      critical: true,
    },
    {
      id: "second_site_addressed",
      description:
        "Does the plan (task file content or the variant presentation in chat) address the duplicated date-formatting logic in src/export/csv_export.ts — either including it in the fix scope or explicitly excluding it with a stated reason? The request does NOT mention the CSV exporter; the agent must discover the duplicated logic itself. Silently omitting it does NOT count.",
      critical: true,
    },
    {
      id: "scope_cut_named_if_dropped",
      description:
        "If any presented variant covers less than the stated outcomes or skips the discovered CSV-exporter site, does that variant's Cons (or equivalent trade-off text) explicitly name what it drops? Pass this item if no variant drops anything.",
      critical: false,
    },
  ];
}();
