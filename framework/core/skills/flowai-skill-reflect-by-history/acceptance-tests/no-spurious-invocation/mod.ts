import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectByHistoryNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-by-history-no-spurious-invocation";
  name = "Reflect-by-History — No Spurious Auto-Invocation";
  skill = "flowai-skill-reflect-by-history";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = "Show me the last 5 git commits in this repo.";

  checklist = [
    {
      id: "no_history_scan",
      description:
        "Did the agent NOT scan IDE session history (.claude/projects/, ~/.claude/projects/, .cursor/projects/, opencode.db) for cross-session analysis? A `git log` or similar git command is expected; reading JSONL session transcripts would indicate spurious auto-invocation.",
      critical: true,
    },
    {
      id: "no_pattern_report",
      description:
        "Did the agent NOT produce a cross-session 'Recurring Patterns' / 'Corrective Actions' report as defined by flowai-skill-reflect-by-history?",
      critical: true,
    },
    {
      id: "direct_git_answer",
      description:
        "Did the agent run a git log command (or read git output) and return commit info directly?",
      critical: true,
    },
  ];
}();
