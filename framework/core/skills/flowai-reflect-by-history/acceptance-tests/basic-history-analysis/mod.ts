import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistoryBasicBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-by-history-basic";
  name = "Reflect on Previous Session History";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "OrdersApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to analyze my previous sessions and find recurring issues. Suggest what project primitives to add or change. For this task, the session history is NOT in the default `~/.claude/projects/` location — read the JSONL files from `.claude/projects/-sandbox/` (path relative to the current working directory). Treat this path as the explicit override per the skill's Discovery Strategy.";

  // JUDGE CONTEXT: The user explicitly overrode the default history path. The skill's Path override step instructs the agent to use the user-supplied path verbatim. Therefore, reading sessions from `.claude/projects/-sandbox/` — and NOT from `~/.claude/projects/` — is the correct behavior. Do not mark an item as failing solely because the agent skipped the default location.
  checklist = [
    {
      id: "locate_history",
      description:
        "Did the agent use the user-specified override path `.claude/projects/-sandbox/` for session history (rather than falling back to the default `~/.claude/projects/`)?",
      critical: true,
    },
    {
      id: "read_history_files",
      description:
        "Did the agent read at least 3 of the 4 session JSONL files from the user-specified override path `.claude/projects/-sandbox/`?",
      critical: true,
    },
    {
      id: "identify_recurring_mock_pattern",
      description:
        "Did the agent identify the recurring JWT mock ordering problem across multiple sessions (appears in 3+ sessions with the same TypeError)?",
      critical: true,
    },
    {
      id: "propose_systemic_fix",
      description:
        "Did the agent propose a systemic fix for the recurring pattern (e.g., shared test setup helper, rule about mock ordering, or hook to validate test structure)?",
      critical: true,
    },
    {
      id: "classify_artifact_type",
      description:
        "Did the agent classify proposed fixes by artifact type (rule, skill, hook, project docs, code change)?",
      critical: true,
    },
    {
      id: "cite_evidence_across_sessions",
      description:
        "Did the agent cite evidence from multiple sessions in the `.claude/projects/-sandbox/` directory (not just one) to support the pattern claim?",
      critical: false,
    },
    {
      id: "narrative_what_happened",
      description:
        "Does each corrective action include a 'What happened' section that tells the full story per session — what the agent was doing, what actions it took, what went wrong — with enough detail that a reader who never saw the sessions understands the complete situation?",
      critical: true,
    },
    {
      id: "narrative_impact",
      description:
        "Does each corrective action include an 'Impact' section with measurable cost — steps wasted, time lost, errors introduced — not just a generic statement?",
      critical: true,
    },
    {
      id: "fix_has_where_and_draft",
      description:
        "Does each corrective action's proposed fix specify an exact file path + section ('Where') AND include ready-to-paste draft content (rule text, code, or config) — not just a vague action like 'add a rule'?",
      critical: true,
    },
  ];
}();
