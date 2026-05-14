// Fixture scenario file (not executed at bench time — it is read by the
// diagnosis skill as evidence).

import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ConductQaSessionMultiSelectFormatBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-conduct-qa-session-multi-select-format";
  name = "Conduct QA: multi-select numeric format with service options";
  skill = "flowai-conduct-qa-session";
  stepTimeoutMs = 300_000;
  interactive = true;
  userQuery =
    "/flowai-conduct-qa-session We are setting up observability and want to pick which signals to ship to the central platform. Ask me to choose any subset from: metrics, traces, profiles, logs, real-user-monitoring. Treat this as multi-select.";
  userPersona =
    `When the agent asks the multi-select question, reply ONLY with the number that selects "agent's choice".`;
  checklist = [
    {
      id: "questions_numbered",
      description: "Question presented as numbered list (1., 2., ...).",
      critical: true,
    },
    {
      id: "options_numbered",
      description:
        "Option choices presented as a numbered sub-list, NOT bullets.",
      critical: true,
    },
    {
      id: "service_option_all",
      description: "Option list includes literal 'all'.",
      critical: true,
    },
    {
      id: "service_option_agent_choice",
      description: 'Option list includes literal "agent\'s choice".',
      critical: true,
    },
  ];
}();
