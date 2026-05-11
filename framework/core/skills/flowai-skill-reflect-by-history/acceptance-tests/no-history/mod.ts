import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistoryNoHistoryBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-by-history-no-history";
  name = "Reflect on History — No Sessions Found";
  skill = "flowai-skill-reflect-by-history";
  stepTimeoutMs = 120_000;
  agentsTemplateVars = {
    PROJECT_NAME: "EmptyApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Use flowai-skill-reflect-by-history to analyze my previous sessions and find recurring issues.";

  checklist = [
    {
      id: "search_for_history",
      description:
        "Did the agent search for session history files in project-local and/or user-level paths (.claude/projects/, ~/.claude/projects/, etc.)?",
      critical: true,
    },
    {
      id: "report_no_history",
      description:
        "Did the agent clearly report that no session history was found (not crash, not hallucinate sessions)?",
      critical: true,
    },
    {
      id: "no_hallucinated_analysis",
      description:
        "Did the agent avoid fabricating analysis results or patterns when no session data exists?",
      critical: true,
    },
  ];
}();
