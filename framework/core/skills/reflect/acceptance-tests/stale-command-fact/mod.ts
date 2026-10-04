import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// FR-ATOM-REFLECT-GATE.STALE-FACTS, standalone reflect. The session ran the
// project check that AGENTS.md names, `deno task verify`, and `deno.json`
// defines no such task. That happens once in the transcript, next to a typo
// that also happens once, so the proportionality filter ("a minor one-off issue
// does not warrant a new rule or hook") reads both as one-offs. Observed
// 2026-10-04 on `review-and-commit-post-reflect-cleanup-commit`: the run that
// failed had opened this skill and quoted that sentence when interviewed. A
// wrong fact in an instruction file is not a one-off to drop; reflect must
// propose correcting the line.
export const ReflectStaleCommandFactBench = new class
  extends AcceptanceTestScenario {
  id = "reflect-stale-command-fact";
  name = "Reflect proposes correcting a command the instructions name wrongly";
  skill = "reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MathLib",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `deno task verify` — the project check: format, lint and all tests.",
  };

  userQuery =
    "Reflect on the agent session recorded in transcript.txt and tell me what, if anything, should change.";

  checklist = [
    {
      id: "read_transcript",
      description: "Did the agent read transcript.txt?",
      critical: true,
    },
    {
      id: "stale_command_found",
      description:
        "Did the final report keep, as a finding, that AGENTS.md names `deno task verify` while `deno.json` defines no `verify` task (only `check` and `test`)? Fails if the failed `deno task verify` call is not mentioned, or is mentioned only to be dismissed as an isolated or one-off incident that needs no change.",
      critical: true,
    },
    {
      id: "correction_proposed",
      description:
        "Did the report propose correcting the AGENTS.md line so it names `deno task check` (an edit of the existing line, not a new rule or hook)?",
      critical: true,
    },
    {
      id: "typo_not_escalated",
      description:
        "Did the agent avoid proposing a new rule, hook or instruction for the one-time `chekc` typo?",
      critical: false,
    },
  ];
}();
