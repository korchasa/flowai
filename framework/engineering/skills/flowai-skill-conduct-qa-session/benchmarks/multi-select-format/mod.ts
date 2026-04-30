import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ConductQaSessionMultiSelectFormatBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-conduct-qa-session-multi-select-format";
  name = "Conduct QA: numbered question + agent's-choice resolution";
  skill = "flowai-skill-conduct-qa-session";
  agentsTemplateVars = {
    PROJECT_NAME: "ObservabilityStack",
    TOOLING_STACK: "- TypeScript\n- Kubernetes",
  };
  stepTimeoutMs = 300_000;

  interactive = true;

  userQuery =
    "/flowai-skill-conduct-qa-session We are setting up observability and want to pick which signals to ship to the central platform. Ask me to choose any subset from: metrics, traces, profiles, logs, real-user-monitoring. Treat this as multi-select.";

  userPersona = `You are a platform engineer.
When the agent asks the multi-select question, reply with the literal phrase "agent's choice" and nothing else. Do NOT name any signal yourself.
After that, do not provide any further input — wait for the agent to announce its picks and proceed.
If the agent ignores the delegation and asks again, repeat: "agent's choice".`;

  checklist = [
    {
      id: "questions_numbered",
      description:
        "Did the agent present its question(s) using a numbered list (a line starting with '1.', '2.', ...)? A bold heading like '**1. Title**', a Markdown heading ('# …'), or a bare paragraph does NOT count.",
      critical: true,
    },
    {
      id: "agent_choice_announces",
      description:
        "After the user delegated with 'agent's choice', did the agent emit a brief one-line justification announcing what subset it picked and why?",
      critical: true,
    },
    {
      id: "agent_choice_proceeds",
      description:
        "After announcing its pick, did the agent proceed without re-asking for confirmation (no extra yes/no prompt to validate the auto-selection)?",
      critical: true,
    },
  ];
}();
