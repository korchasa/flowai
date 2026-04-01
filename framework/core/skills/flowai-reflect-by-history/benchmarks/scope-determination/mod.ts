import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectByHistoryScopeBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-reflect-by-history-scope";
  name = "Reflect on History — Scope Determination";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "BigApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to check what went wrong in my last few sessions.";

  checklist = [
    {
      id: "locate_history",
      description:
        "Did the agent find the session history JSONL files in .claude/projects/-sandbox/?",
      critical: true,
    },
    {
      id: "limit_scope",
      description:
        "Did the agent analyze only a subset of sessions (3-5 recent, not all 8) based on the 'last few sessions' request?",
      critical: true,
    },
    {
      id: "explain_scope",
      description:
        "Did the agent explain why it chose that scope (e.g., 'analyzing last 3-5 sessions as requested')?",
      critical: true,
    },
    {
      id: "analyze_recent_only",
      description:
        "Did the agent focus primarily on the most recent sessions (at least session-07 and session-08 included) rather than giving equal weight to all 8 sessions?",
      critical: false,
    },
  ];
}();
