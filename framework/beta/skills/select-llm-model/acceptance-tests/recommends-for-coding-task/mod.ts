import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// The `curl` mock is a PATH-shadowing stub (`writeMockBin`), so its text is
// what `curl` ITSELF prints — the parser's INPUT. It must therefore be the
// Aider leaderboard YAML. The retracted comment that stood here until
// 2026-08-24 said the mock was "a PreToolUse *block* hook" substituting the
// whole Bash command's output, and held already-parsed `BenchRow` JSON on that
// basis; that mechanism was retired with the ACP migration. The scenario stayed
// green only because the agent read `curl` on its own rather than through the
// documented `curl … | … --stdin` pipe — the sibling `cites-sources` scenario
// took the pipe in the sweep of 2026-08-23 and every source became a Gap.
// Fictional models (Aurora-7 / Borealis-3 / Cypher-X) prove the agent ranked the
// FETCHED rows, not models recalled from memory.
const AIDER_YAML = `- model: Aurora-7
  pass_rate_2: 88.0
- model: Borealis-3
  pass_rate_2: 64.0
- model: Cypher-X
  pass_rate_2: 48.0
`;

export const SelectLlmModelRecommendsForCodingTask = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-recommends-for-coding-task";
  name = "Recommends models for a code-editing task via benchmarks tool";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: AIDER_YAML };

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
