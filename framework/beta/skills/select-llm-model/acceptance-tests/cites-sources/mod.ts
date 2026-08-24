import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Block-mock for the `curl` PATH stub. It must be the Aider leaderboard YAML —
// the stub replaces `curl`, so its text is the PARSER'S INPUT, not its output,
// and `benchmarks.ts` documents the seam as `curl … | … --stdin`. Until
// 2026-08-24 this mock held already-parsed BenchRow JSON; it scored green only
// while the agent read `curl` standalone, and in the sweep of 2026-08-23 the
// agent followed the documented pipeline instead, the Aider parser rejected the
// JSON, every source became a Gap, and the run produced no scores to cite.
// The payload carries only diff-edit rows. The query also asks for tool-use,
// which lives under the `agentic` category (Artificial Analysis) — that parser
// gets the same YAML and yields nothing — so the agent must CITE Aider for
// diff-edit, report a fetch timestamp, and surface tool-use as an explicit Gap
// rather than fabricating tool-use scores.
const AIDER_YAML = `- model: Aurora-7
  pass_rate_2: 88.0
- model: Borealis-3
  pass_rate_2: 64.0
- model: Cypher-X
  pass_rate_2: 48.0
`;

export const SelectLlmModelCitesSources = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-cites-sources";
  name = "Cites sources, timestamps the fetch, lists gaps";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: AIDER_YAML };

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
