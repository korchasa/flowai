import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Scenario: the failed run sits in a layout the skill was never told about.
 *
 * Every other scenario for this skill stages the run the way flowai's own
 * runner writes it, so none of them can tell a general method from a memorised
 * path. This one stages the same four artefact kinds under a different
 * project's names: `evals/runs/<ts>/<scenario>/attempt-1/` instead of a `runs`
 * directory with a `latest` symlink, `judge-report.md` instead of the judge
 * rendering this repo writes, `workspace/` instead of `sandbox/`,
 * `agent-home/` instead of `bench-home/`, and a `scenario.ts` whose fields are
 * `prompt` and `checks` rather than `userQuery` and `checklist`.
 *
 * The defect staged inside is deliberately one the skill already handles: the
 * agent told itself no subagent tool existed and the transcript shows `Task`
 * invoked twice. Holding the defect constant keeps the scenario about one
 * thing — finding the evidence when the paths are not the ones the skill knows.
 *
 * Fail-closed (rule 4) is the trap. An artefact that is present under another
 * name is not a missing artefact, and stopping on "no judge-evidence.md here"
 * is the failure this scenario exists to catch.
 */
export const DiagnoseBenchForeignLayoutBench = new class
  extends AcceptanceTestScenario {
  id = "diagnose-benchmark-failure-foreign-layout";
  name = "Diagnose benchmark failure — a run directory in a foreign layout";
  skill = "diagnose-benchmark-failure";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "evalHarnessSandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = false;

  userQuery = "/diagnose-benchmark-failure split-work-parallel";

  checklist = [
    {
      id: "found_run_dir",
      description:
        "Does the report name the run directory it inspected — the path under `evals/runs/2026-05-02T10-00-00/split-work-parallel/attempt-1/`? It was never given that path, so naming it proves the agent searched for the artefacts instead of assuming a layout.",
      critical: true,
    },
    {
      id: "read_transcript",
      description:
        "Did the agent open the raw agent transcript — the `.jsonl` file under `attempt-1/agent-home/.claude/projects/`? Any access counts: a Read call, or a Bash call running jq/grep/cat against that path.",
      critical: true,
    },
    {
      id: "read_judge_rendering_and_scenario",
      description:
        "Does the report cite BOTH the judge's rendering of the session (`judge-report.md`) and the scenario definition (`evals/scenarios/split-work-parallel/scenario.ts`)? Citing the verdict file or the skill snapshot instead of either one does not count.",
      critical: true,
    },
    {
      id: "no_fail_closed_on_names",
      description:
        "Did the agent AVOID stopping because a file it expected was absent? A report that says an artefact is missing — for example `judge-evidence.md`, a `bench-home/` directory, a `latest` symlink, or a `mod.ts` — and halts or delivers only a partial diagnosis fails this item. All four artefact kinds are present in this run under other names.",
      critical: true,
    },
    {
      id: "classification_follows_transcript",
      description:
        "Is the primary cause about the agent's own choice to abandon delegation — and/or about the skill clause that let it proceed sequentially when parallel execution is 'unavailable' — rather than about a missing capability or a harness limitation? The report must back this with the transcript, for example a tool-call count or a quoted line showing `Task` was invoked.",
      critical: true,
    },
    {
      id: "no_files_edited",
      description:
        "Did the agent NOT edit, create, or delete any file under `evals/` or `skills/`? Report-only behaviour — reading is fine, writing is not.",
      critical: true,
    },
  ];
}();
