import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Models the SWE-bench django-14792 failure: a bug with one NAMED root cause
 * (getTimezoneName returns undefined for fixed-offset zones) and a tempting,
 * larger-feeling symptom patch in three DB backends. The root helper is also
 * used by a template renderer, which makes the root fix feel "risky" — but the
 * caller is display-only, so inspecting it shows the fear is unfounded.
 *
 * A plan recommendation that ranks "smallest diff / lowest speculative risk"
 * above root-cause fidelity will recommend the symptom patch and ship the wrong
 * fix once the human gate takes the recommendation. The ranking rubric in step 4
 * of plan.md must instead rank root-cause fidelity first and require inspected-
 * caller evidence before rejecting the root-cause variant.
 *
 * REGRESSION-GUARD, NOT RED-first: this scenario passes on both
 * claude-sonnet-4-6 and claude-haiku-4-5 with AND without the ranking rubric.
 * The original mis-ranking failure stems from large-codebase caller-uncertainty
 * (real Django), which a small self-contained fixture cannot reproduce — the
 * causal chain here is short and render.ts is one cheap read, so any capable
 * model already recommends the root fix. Kept as a guard against future
 * regression of the ranking discipline; see FR-PLAN-VARIANT-ARCHETYPES note.
 */
export const PlanRecommendsRootOverSymptomBench = new class
  extends AcceptanceTestScenario {
  id = "plan-recommends-root-over-symptom";
  name = "Plan Recommendation - Root Cause Over Symptom";
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
    "/plan Bug: datetime DB queries on a fixed-offset timezone (e.g. UTC+05:00) build invalid SQL — the timezone name renders as the literal 'undefined'. IANA named zones (e.g. Europe/Paris) work fine. " +
    "Team note: getTimezoneName() in src/utils/timezone.ts is a shared core utility imported across the codebase, including the user-facing template layer (src/templates/render.ts); our convention is to avoid touching shared utils unless necessary because changes there ripple everywhere. The bug only surfaces in the DB datetime casts in src/db/ (postgres_ops.ts, mysql_ops.ts, sqlite_ops.ts). " +
    "Plan the fix.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write to a file in 'documents/tasks/' directory (as required by the planning process)?",
      critical: true,
    },
    {
      id: "names_root_cause",
      description:
        "Does the recommendation explicitly identify the ROOT cause — that getTimezoneName() in src/utils/timezone.ts returns undefined for fixed-offset zones — rather than describing only the DB-layer symptom (the 'AT TIME ZONE'/CONVERT_TZ/datetime clauses)? Judge by intent; the exact phrasing may vary.",
      critical: true,
    },
    {
      id: "surfaces_root_variant",
      description:
        "Did the agent surface, among the variants, an option that fixes the root helper getTimezoneName() itself (e.g. returning a fallback like the offset string for fixed-offset zones), not only options that patch the three DB backends?",
      critical: false,
    },
    {
      id: "recommends_root_or_evidence",
      description:
        "Does the FINAL recommendation pick the variant that fixes the root helper getTimezoneName()? OR — only if it instead recommends a DB-layer/symptom patch and down-ranks the root-helper fix — does it justify rejecting the root-cause variant with EVIDENCE from actually inspecting the helper's callers (e.g. reading src/templates/render.ts and finding it display-only), NOT a speculative unverified risk?",
      critical: true,
    },
    {
      id: "no_unverified_speculative_downrank",
      description:
        "Does the agent AVOID down-ranking or rejecting the root-cause fix solely on an unverified speculative risk (e.g. 'getTimezoneName is used in templates, so changing it is risky') WITHOUT having actually inspected src/templates/render.ts to check the real impact?",
      critical: true,
    },
  ];
}();
