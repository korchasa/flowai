import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Post-selection half of the outcome-completeness discipline (atom edits
 * #3-post and #4): the simulated user makes an EXPLICIT scope cut — "only the
 * monthly report screen for now" — so the selected variant drops part of the
 * stated outcome set / discovered surface by construction. The plan must then
 * record the dropped outcomes under `## Follow-ups` in the task file (not
 * only in chat) and run the Step-7 completeness check: every stated outcome
 * maps to a DoD item, a Solution step, or a Follow-ups entry with a reason.
 *
 * Mirrors django-13195/16256: a seen-but-dropped requirement vanished
 * silently. The scope choice itself is legitimate and belongs to the user;
 * what this scenario guards is that the cut is RECORDED, not silent.
 */
export const PlanRecordsDroppedOutcomesBench = new class
  extends AcceptanceTestScenario {
  id = "plan-records-dropped-outcomes";
  name = "Plan Follow-ups - Records User-Selected Scope Cuts";
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

  userPersona =
    `You are a busy product owner. IMPORTANT: The agent may speak Russian. When you see a question ending with '?' or asking you to choose (e.g. 'Какой вариант', 'выбираете', 'предпочитаете', 'подтвердите'), you MUST respond.
When asked to choose between variants, say: "Fix ONLY the monthly report screen for now — the smallest change possible. Anything beyond the report screen (other output paths, exporters) is not urgent and should NOT be in this fix."
When asked for confirmation, agree and ask to proceed.`;

  interactive = true;

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write a task file in the 'documents/tasks/' directory?",
      critical: true,
    },
    {
      id: "solution_filled",
      description:
        "After the user selected a variant, does the task file's 'Solution' section contain concrete implementation steps (not a placeholder, not '_Pending variant selection._', not a comment)?",
      critical: true,
    },
    {
      id: "followups_record_dropped",
      description:
        "Given the user explicitly limited the fix to the monthly report screen: does the task FILE record what was thereby dropped or deferred (e.g. the duplicated date formatting in src/export/csv_export.ts, or any stated outcome the narrow variant does not cover) under a '## Follow-ups' (or equivalent deferral) section, naming the deferral reason? Chat-only mentions do NOT count — the record must be in the task file.",
      critical: true,
    },
    {
      id: "no_outcome_vanishes",
      description:
        "Do BOTH stated spec outcomes — (a) out-of-range dates render \"0-0-0\", (b) month 0 falls back to 01 — appear somewhere in the task file (Definition of Done, Solution steps, or Follow-ups)? An outcome that appears nowhere in the file has silently vanished and FAILS this check.",
      critical: true,
    },
    {
      id: "no_triage_reask",
      description:
        "During the critique/triage phase (after variant selection), did the agent AVOID asking the user which critique items to apply (triage is agent-owned)?",
      critical: false,
    },
  ];
}();
