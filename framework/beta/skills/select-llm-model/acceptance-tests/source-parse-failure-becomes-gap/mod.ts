import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Reliability contract: when a source returns bytes the tool cannot read (a
// JS-rendered SPA shell instead of data), the
// `curl … | deno run scripts/benchmarks.ts scores --category … --stdin` pipe
// exits non-zero. The block-mock stands in for that FAILED pipe — the tool's
// stderr line + non-zero status (the catch path). The skill MUST record the
// source as an explicit Gap and MUST NOT fabricate a ranking; with every source
// unparseable the correct behaviour is "report the gaps and stop".
// (Tool-exit-on-garbage is unit-tested separately.)
const PARSER_FAILURE =
  `response body is not JSON — no usable rows parsed; source becomes a Gap\nEXIT:1`;

export const SelectLlmModelSourceParseFailureBecomesGap = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-source-parse-failure-becomes-gap";
  name = "Unparseable source becomes a Gap, never a fabricated row";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: PARSER_FAILURE };

  userQuery =
    "Use select-llm-model: which model is best for general intelligence and coding right now?";

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load and act on the `select-llm-model` skill?",
      critical: true,
    },
    {
      id: "ran_parser_pipe",
      description:
        "Did the agent attempt the fetch+parse pipeline (`curl … | deno run scripts/benchmarks.ts scores --category …`) before concluding?",
      critical: false,
    },
    {
      id: "reports_gaps",
      description:
        "Did the agent report the source(s) as explicit GAPS (the parser returned no usable rows / exited non-zero), naming why, instead of silently dropping them?",
      critical: true,
    },
    {
      id: "no_fabricated_ranking",
      description:
        "Did the agent REFUSE to produce a ranked recommendation from memory when every source ended up a Gap? Naming/ranking specific models with scores here is a FAIL.",
      critical: true,
    },
  ];
}();
