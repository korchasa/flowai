import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Non-code surface discipline (loop5 critic round 1 objection 10 / round 3
 * objection 6: the domain-neutrality claim needs a non-code fixture).
 *
 * The "repo" is a process-documentation tree: the request changes the vendor
 * onboarding process; a PARALLEL process document (contractor onboarding)
 * duplicates the affected step, and a downstream template consumes it. The
 * scout dispatch + persisted `### Affected Surface` artifact must work with
 * per-domain evidence forms (document/step/owner), not code paths.
 */
export const PlanSurfaceNonCodeBench = new class
  extends AcceptanceTestScenario {
  id = "plan-surface-non-code";
  name = "Plan surface discipline on a non-code (process docs) request";
  skill = "plan";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "OpsHandbook",
    TOOLING_STACK: "- Markdown process documentation (no application code)",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Process change: vendor onboarding must add a mandatory security questionnaire " +
    "BEFORE the access-granting step. Required outcomes: " +
    "(1) no vendor account is provisioned until the questionnaire is marked approved; " +
    "(2) the onboarding checklist shows the questionnaire as an explicit step with an owner (Security team). " +
    "Plan the documentation/process update.";

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
        "Does the tool-call trace show the agent dispatching a SUBAGENT named 'surface-scout' (Task/Agent tool invocation targeting surface-scout)? Inline searching by the main agent does NOT count.",
      critical: true,
    },
    {
      id: "surface_table_persisted",
      description:
        "Does the task file contain an '### Affected Surface' subsection under '## Overview' with the scout's verbatim output block AND per-item disposition bullets?",
      critical: true,
    },
    {
      id: "non_code_evidence_forms",
      description:
        "Do the surface items and their evidence use process-domain forms — document names, process steps, owners/teams (e.g. 'processes/contractor-onboarding.md, step 4, Security team') — rather than demanding code paths/line numbers that do not exist in this repo?",
      critical: true,
    },
    {
      id: "parallel_process_in_table",
      description:
        "Does the affected-surface content include the PARALLEL contractor onboarding process (processes/contractor-onboarding.md, which duplicates the access-granting step) — a document the request never mentions?",
      critical: true,
    },
  ];
}();
