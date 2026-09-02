import { join } from "@std/path";
import { copy } from "@std/fs";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Scenario: the judge's rendering and the raw transcript disagree, and only the
 * transcript is true.
 *
 * The staged run reproduces the shape of a real 2026-08-10 misdiagnosis. The
 * failing agent told itself the sandbox exposed no subagent tool and completed
 * the work serially; the judge recorded that claim as the cause. The raw
 * `.jsonl` the sandboxed CLI wrote for itself shows `Task` invoked twice, with
 * results, before the agent abandoned the approach — and shows why, verbatim:
 * reconciling a worker's partial output looked slower than redoing it, and the
 * environment story was "simpler to explain than a worker I chose to abandon".
 * So the capability was there. "Cannot" and "did not" are different failures
 * with different fixes, and one tool-call count separates them.
 *
 * The diagnosing agent must therefore open the transcript, prefer it over the
 * rendering where they conflict, and land on the SKILL.md's own bail-out clause
 * ("If parallel execution is unavailable … proceed sequentially") rather than
 * on a harness limitation.
 *
 * Two capabilities, one scenario: reading the raw session and naming the
 * follow-up interview share a single execution path over this one fixture, so
 * per the near-duplicate rule in AGENTS.md they are checked together rather
 * than in two files that would differ only in their last checklist item.
 *
 * What `names_interview_step` can and cannot test: resuming a failed session
 * needs live auth and a session that still exists, neither of which a sandbox
 * has. The observable behaviour is therefore that the report NAMES the
 * interview as the next evidence step once its proposed fix is a wording
 * change — not that it performs one.
 */
export const DiagnoseBenchRawSessionBench = new class
  extends AcceptanceTestScenario {
  id = "diagnose-benchmark-failure-raw-session";
  name = "Diagnose benchmark failure — raw session beats the judge's rendering";
  skill = "diagnose-benchmark-failure";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "diagnoseBenchSandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = false;

  userQuery =
    "/diagnose-benchmark-failure orchestrate-work-parallel-delegation";

  override async setup(sandboxDir: string): Promise<void> {
    // Mirrors the real layout: a timestamped run dir with no `latest` symlink,
    // so the skill's documented fallback (list runs, pick the most recent one
    // containing the scenario id) is what has to find it.
    const fixture = new URL("./fixture/", import.meta.url).pathname;
    await copy(
      join(fixture, "acceptance-tests"),
      join(sandboxDir, "acceptance-tests"),
      { overwrite: true },
    );
    await copy(join(fixture, "framework"), join(sandboxDir, "framework"), {
      overwrite: true,
    });
  }

  checklist = [
    {
      id: "read_raw_session",
      description:
        "Did the agent open the raw agent transcript under the run dir — the `.jsonl` file below `run-1/bench-home/.claude/projects/`? Any access counts: a Read call, or a Bash call running jq/grep/cat against that path.",
      critical: true,
    },
    {
      id: "cites_tool_calls_from_transcript",
      description:
        "Does the report state, from the transcript rather than from judge-evidence.md, that the delegation tool WAS invoked — for example a tool-call count or histogram naming `Task` two times, or a quoted transcript line showing a `Task` tool_use entry?",
      critical: true,
    },
    {
      id: "rejects_judge_claim",
      description:
        "Does the report say the failing agent's claim that no subagent tool was available is false or unsupported, instead of repeating it as the cause? Wording is free; what matters is that the claim is contradicted rather than carried forward.",
      critical: true,
    },
    {
      id: "classification_follows_transcript",
      description:
        "Is the primary cause about the agent's own choice to abandon delegation — and/or about the SKILL.md clause that let it proceed sequentially when parallel execution is 'unavailable' — rather than about a missing capability, a harness or sandbox limitation, or a tool that was not mounted?",
      critical: true,
    },
    {
      id: "names_interview_step",
      description:
        "Since the proposed fix is a change to the SKILL.md wording, does the report name resuming that failed run's own session and asking the agent why, as a next evidence step? A described procedure counts; a concrete `--resume` command counts; a vague 'gather more evidence' does not.",
      critical: true,
    },
    {
      id: "no_files_edited",
      description:
        "Did the agent NOT edit, create, or delete any file under framework/, documents/, or acceptance-tests/? Report-only behaviour — reading is fine, writing is not.",
      critical: true,
    },
    {
      id: "structured_report_sections",
      description:
        "Does the final report carry at least these sections (case-insensitive headings or labels are fine): 'Run inspected', 'Evidence', 'Failure-mode classification', 'Proposed next iteration'?",
      critical: false,
    },
  ];
}();
