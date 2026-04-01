import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectByHistoryBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-reflect-by-history-basic";
  name = "Reflect on Previous Session History";
  skill = "flowai-reflect-by-history";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "OrdersApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-reflect-by-history to analyze my previous sessions and find recurring issues. Suggest what project primitives to add or change.";

  checklist = [
    {
      id: "locate_history",
      description:
        "Did the agent autonomously find session history JSONL files by searching the project's .claude/projects/ directory without being told the exact path?",
      critical: true,
    },
    {
      id: "read_history_files",
      description:
        "Did the agent read at least 3 of the 4 session JSONL files from .claude/projects/-sandbox/?",
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
        "Did the agent cite evidence from multiple sessions (not just one) to support the pattern claim?",
      critical: false,
    },
  ];
}();
