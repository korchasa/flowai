import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// The acceptance `curl` mock is a PreToolUse *block* hook: it substitutes the
// whole Bash command's output, so for the canonical pipe
// `curl … | deno run scripts/benchmarks.ts scores --category diff-edit --stdin`
// it stands in for the PIPE's result — i.e. the tool's `BenchRow` JSON (tool
// correctness itself is covered by the deno unit tests next to the scripts).
// Fictional models (Aurora-7 / Borealis-3 / Cypher-X) prove the agent ranked the
// FETCHED rows, not models recalled from memory.
const BENCH_JSON = JSON.stringify([
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

export const SelectLlmModelRecommendsForCodingTask = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-recommends-for-coding-task";
  name = "Recommends models for a code-editing task via benchmarks tool";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: BENCH_JSON };

  userQuery =
    "Use select-llm-model: which model is best at editing existing code by applying diffs/patches across a repository? Rank a few options.";

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load and act on the `select-llm-model` skill (a `Skill` tool call or a read of its SKILL.md)?",
      critical: true,
    },
    {
      id: "fetched_via_parser_pipe",
      description:
        "Did the agent fetch via the tool pipeline — a shell `curl` piped into `deno run scripts/benchmarks.ts scores --category …` — rather than answering from memory or hand-parsing HTML?",
      critical: true,
    },
    {
      id: "ranked_shortlist",
      description:
        "Did the agent output a RANKED shortlist of models (an ordered top list, not a flat unordered mention)?",
      critical: true,
    },
    {
      id: "ranks_fetched_models",
      description:
        "Are the ranked models the FETCHED fictional ones (Aurora-7, Borealis-3, Cypher-X), NOT real-world models from memory? Aurora-7 should rank top given its leading pass_rate_2.",
      critical: true,
    },
    {
      id: "per_axis_rationale",
      description:
        "Did the agent give per-axis rationale naming the source (diff-edit via the Aider Polyglot leaderboard) explaining WHY each model ranks where it does?",
      critical: true,
    },
    {
      id: "derived_axis",
      description:
        "Did the agent derive diff-edit / code-editing as the dominant capability axis from the task description (and disclose its assumed weighting)?",
      critical: false,
    },
  ];
}();
