import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistorySelfCriticismBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-by-history-self-criticism";
  name = "Reflect on History with Self-Criticism";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "WebAPI",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to analyze my previous sessions. Find recurring patterns and evaluate the quality of your own analysis before presenting the final report. For this task, the session history is NOT in the default `~/.claude/projects/` location — read the JSONL files from `.claude/projects/-sandbox/` (path relative to the current working directory). Treat this path as the explicit override per the skill's Discovery Strategy.";

  // JUDGE CONTEXT: The user explicitly overrode the default history path. The skill's Path override step instructs the agent to use the user-supplied path verbatim. Therefore, reading sessions from `.claude/projects/-sandbox/` — and NOT from `~/.claude/projects/` — is the correct behavior. Do not mark an item as failing solely because the agent skipped the default location.
  checklist = [
    {
      id: "locate_and_read_history",
      description:
        "Did the agent read at least 2 of the 3 session JSONL files from the user-specified override path `.claude/projects/-sandbox/`?",
      critical: true,
    },
    {
      id: "identify_test_modification_pattern",
      description:
        "Did the agent identify the recurring pattern of modifying tests to match code instead of fixing code (present in sessions 2026-04-01 and 2026-04-05)?",
      critical: true,
    },
    {
      id: "self_criticism_present",
      description:
        "Did the agent perform an explicit self-criticism step — questioning the validity, proportionality, or completeness of its cross-session analysis before presenting the final report?",
      critical: true,
    },
    {
      id: "revision_visible",
      description:
        "Did the agent revise, refine, or adjust at least one of its findings based on the self-criticism (e.g., reclassify a pattern, adjust severity, remove a weak finding, or add a missed pattern)?",
      critical: true,
    },
    {
      id: "propose_systemic_fix",
      description:
        "Did the agent propose a systemic fix for the test-modification pattern (e.g., rule about fixing code not tests, hook to detect test-only changes)?",
      critical: true,
    },
    {
      id: "classify_artifact_type",
      description:
        "Did the agent classify proposed fixes by artifact type (rule, skill, hook, project docs, code change)?",
      critical: false,
    },
  ];
}();
