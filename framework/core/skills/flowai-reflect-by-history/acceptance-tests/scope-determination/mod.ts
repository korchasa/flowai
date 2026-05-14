import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistoryScopeBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-by-history-scope";
  name = "Reflect on History — Scope Determination";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "BigApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to check what went wrong in my last few sessions. For this task, the session history is NOT in the default `~/.claude/projects/` location — read the JSONL files from `.claude/projects/-sandbox/` (path relative to the current working directory). Treat this path as the explicit override per the skill's Discovery Strategy.";

  // JUDGE CONTEXT: The user explicitly overrode the default history path. The skill's Path override step instructs the agent to use the user-supplied path verbatim. Therefore, reading sessions from `.claude/projects/-sandbox/` — and NOT from `~/.claude/projects/` — is the correct behavior. Do not mark an item as failing solely because the agent skipped the default location.
  checklist = [
    {
      id: "locate_history",
      description:
        "Did the agent use the user-specified override path `.claude/projects/-sandbox/` for session history (rather than falling back to the default `~/.claude/projects/`)?",
      critical: true,
    },
    {
      id: "limit_scope",
      description:
        "Did the agent analyze ~5 sessions (target from SKILL.md Scope Determination table for 'last few' = Recent → Last 5) with a tolerance of ±2, i.e., any count in [3, 7]? Reading all 8 fails — the agent must respect the scope cap even when the full history is small.",
      critical: true,
    },
    {
      id: "explain_scope",
      description:
        "Did the agent explain its scope choice by naming the bucket (Recent/Deep/Single/Default/Trend) AND the exact number of sessions (~5, tolerance ±2), AND referencing the user's phrasing ('last few', 'recently', etc.)? 'Volume is small, analyzing everything' does NOT satisfy this — it contradicts the SKILL rule.",
      critical: true,
    },
    {
      id: "analyze_recent_only",
      description:
        "Did the agent focus primarily on the most recent sessions (session-07 and session-08 must be included and weighted more than session-01/02) rather than giving equal weight to all 8 sessions?",
      critical: false,
    },
  ];
}();
