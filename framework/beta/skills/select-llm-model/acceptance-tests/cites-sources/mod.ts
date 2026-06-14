import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Block-mock stands in for the `benchmarks.ts scores` output (BenchRow JSON; see
// the recommends scenario for the mechanism). It carries only diff-edit rows
// (category `diff-edit`, source Aider). The query also asks for tool-use, which
// lives under the `agentic` category (Artificial Analysis) — and these rows have
// none — so the agent must CITE Aider for diff-edit, report a fetch timestamp,
// and surface tool-use as an explicit Gap rather than fabricating tool-use scores.
const PARSER_JSON = JSON.stringify([
  {
    category: "diff-edit",
    benchmark: "aider-polyglot",
    source: "aider",
    model: "Aurora-7",
    score: 88,
    higherIsBetter: true,
  },
  {
    category: "diff-edit",
    benchmark: "aider-polyglot",
    source: "aider",
    model: "Borealis-3",
    score: 64,
    higherIsBetter: true,
  },
  {
    category: "diff-edit",
    benchmark: "aider-polyglot",
    source: "aider",
    model: "Cypher-X",
    score: 48,
    higherIsBetter: true,
  },
]);

export const SelectLlmModelCitesSources = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-cites-sources";
  name = "Cites sources, timestamps the fetch, lists gaps";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: PARSER_JSON };

  userQuery =
    "Use select-llm-model: which model is best for editing code via diffs AND for tool-use/function-calling dialogues? I want to see where each number comes from.";

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load and act on the `select-llm-model` skill?",
      critical: true,
    },
    {
      id: "cites_source_per_score",
      description:
        "Does each model's per-axis standing name the SOURCE it came from (e.g., 'Aider Polyglot leaderboard'), rather than presenting uncited numbers?",
      critical: true,
    },
    {
      id: "fetch_timestamp",
      description:
        "Did the agent report WHEN the data was fetched (a fetch timestamp / 'as of' time)?",
      critical: true,
    },
    {
      id: "reports_gaps",
      description:
        "Did the agent explicitly list GAPS — sources that failed or lacked data (here the tool-use source, Artificial Analysis, returned no usable rows for this payload) — instead of silently omitting them?",
      critical: true,
    },
    {
      id: "no_fabricated_scores",
      description:
        "Did the agent AVOID fabricating tool-use scores when that source returned no data? Missing axes must be 'no data', not invented numbers.",
      critical: true,
    },
  ];
}();
