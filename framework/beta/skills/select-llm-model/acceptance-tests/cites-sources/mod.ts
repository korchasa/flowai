import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Same static `curl` payload as the recommends scenario, BUT the SWE-bench /
// Terminal-Bench blocks are absent — so the agentic-coding axis has "no data"
// for the fetched models. This forces the agent to (a) cite the sources it DID
// use and (b) surface the missing sources as explicit Gaps rather than
// fabricating coding scores.
const PARTIAL_LEADERBOARD =
  `ARTIFICIAL ANALYSIS — Intelligence Index (live leaderboard)
Model        IntelligenceIndex   $/Mtok   tok/s
Aurora-7     71                  8.0      180
Borealis-3   64                  3.0      240
Cypher-X     58                  1.5      320`;

export const SelectLlmModelCitesSources = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-cites-sources";
  name = "Cites sources, timestamps the fetch, lists gaps";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: PARTIAL_LEADERBOARD };

  userQuery =
    "Use select-llm-model: which model is best for agentic coding AND for hard reasoning? I want to see where each number comes from.";

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
        "Does each model's per-axis standing name the SOURCE it came from (e.g., 'Artificial Analysis Intelligence Index'), rather than presenting uncited numbers?",
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
        "Did the agent explicitly list GAPS — sources that failed or lacked data (here: agentic-coding sources like SWE-bench/Terminal-Bench and the reasoning sources were not available in the fetched payload) — instead of silently omitting them?",
      critical: true,
    },
    {
      id: "no_fabricated_coding_scores",
      description:
        "Did the agent AVOID fabricating agentic-coding or reasoning scores for the models when those sources returned no data? Missing axes must be 'no data', not invented numbers.",
      critical: true,
    },
  ];
}();
