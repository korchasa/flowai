import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Simulate "no shell fetch tool available": both curl and wget are mocked to
// the shell's not-found message. The skill MUST fail-fast (report it cannot
// fetch live data) and MUST NOT fabricate a ranking from memory.
export const SelectLlmModelFailsFastNoFetch = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-fails-fast-no-fetch";
  name = "Fail-fast when no fetch tool is available";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = {
    curl: "bash: curl: command not found",
    wget: "bash: wget: command not found",
  };

  userQuery = "Use select-llm-model: what's the best LLM for coding right now?";

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load and act on the `select-llm-model` skill?",
      critical: true,
    },
    {
      id: "attempted_fetch",
      description:
        "Did the agent attempt a shell fetch (curl/wget) before concluding anything?",
      critical: false,
    },
    {
      id: "reports_no_fetch",
      description:
        "Did the agent report that it CANNOT retrieve live leaderboard data because no shell fetch tool (curl/wget) is available?",
      critical: true,
    },
    {
      id: "no_fabricated_ranking",
      description:
        "Did the agent REFUSE to produce a ranked model recommendation — i.e., it did NOT fabricate model standings from memory? Naming/ranking specific models with scores here is a FAIL.",
      critical: true,
    },
  ];
}();
