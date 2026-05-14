import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistoryMixedBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-by-history-mixed";
  name = "Reflect on History — Multiple Recurring Patterns";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MixedApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to find all recurring patterns across my sessions and prioritize them. For this task, the session history is NOT in the default `~/.claude/projects/` location — read the JSONL files from `.claude/projects/-sandbox/` (path relative to the current working directory). Treat this path as the explicit override per the skill's Discovery Strategy.";

  // JUDGE CONTEXT: The user explicitly overrode the default history path. The skill's Path override step instructs the agent to use the user-supplied path verbatim. Therefore, reading sessions from `.claude/projects/-sandbox/` — and NOT from `~/.claude/projects/` — is the correct behavior. Do not mark an item as failing solely because the agent skipped the default location.
  checklist = [
    {
      id: "locate_and_read_history",
      description:
        "Did the agent read session history JSONL files from the user-specified override path `.claude/projects/-sandbox/`?",
      critical: true,
    },
    {
      id: "identify_pattern_1",
      description:
        "Did the agent identify the recurring 'forgotten AGENTS.md read' pattern (agent starts coding without reading project docs, appears in 3/5 sessions)?",
      critical: true,
    },
    {
      id: "identify_pattern_2",
      description:
        "Did the agent identify the recurring 'test run without lint' pattern (agent runs tests but skips linter, lint errors found later, appears in 3/5 sessions)?",
      critical: true,
    },
    {
      id: "distinguish_isolated",
      description:
        "Did the agent distinguish the one-off typo fix in session-03 as an isolated issue (not a recurring pattern)?",
      critical: true,
    },
    {
      id: "prioritize_by_frequency",
      description:
        "Did the agent prioritize patterns by frequency or impact (both recurring patterns ranked above isolated issues)?",
      critical: true,
    },
    {
      id: "propose_different_artifact_types",
      description:
        "Did the agent propose different artifact types for different patterns (e.g., rule for docs-first, hook for lint-before-test)?",
      critical: false,
    },
  ];
}();
