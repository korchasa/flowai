import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const CursorAgentParseJsonBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-cursor-agent-integration-parse-json";
  name = "Parse cursor-agent JSON output and extract session info";
  skill = "flow-skill-cursor-agent-integration";

  userQuery =
    "/flow-skill-cursor-agent-integration I have a cursor-agent JSON output file at agent-output.json. Parse it and tell me: the session ID, whether it succeeded, the duration, and how many messages were exchanged. Then explain how I would resume this session with a follow-up prompt.";

  checklist = [
    {
      id: "extracts_session_id",
      description:
        "Did the agent correctly extract the session_id (a1b2c3d4-e5f6-7890-abcd-ef1234567890)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "identifies_success",
      description:
        'Did the agent correctly identify the subtype as "success" and is_error as false?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "extracts_duration",
      description:
        "Did the agent report the duration (5210ms or ~5.2 seconds)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "counts_messages",
      description:
        "Did the agent correctly count 3 messages (1 user + 2 assistant)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "resume_command",
      description:
        "Did the agent explain the resume command using --resume with the session_id?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
