import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Static `curl` mock: the PreToolUse hook returns this SAME payload for every
// curl invocation (one mock = one response). The synthetic leaderboard uses
// fictional model names so a pass proves the agent ranked FETCHED data, not
// models recalled from memory.
const LEADERBOARD = `ARTIFICIAL ANALYSIS — Intelligence Index (live leaderboard)
Model        IntelligenceIndex   $/Mtok   tok/s
Aurora-7     71                  8.0      180
Borealis-3   64                  3.0      240
Cypher-X     58                  1.5      320

SWE-bench Verified — % resolved
Aurora-7     72.1
Borealis-3   65.4
Cypher-X     48.0

Terminal-Bench — % solved
Aurora-7     69.0
Borealis-3   55.2
Cypher-X     40.1`;

export const SelectLlmModelRecommendsForCodingTask = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-recommends-for-coding-task";
  name = "Recommends models for an agentic-coding task";
  skill = "select-llm-model";
  pack = "beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  mocks = { curl: LEADERBOARD };

  userQuery =
    "Which LLM model should I use for autonomous, multi-file agentic refactoring of a large Python repository? Use select-llm-model.";

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load and act on the `select-llm-model` skill (a `Skill` tool call or a read of its SKILL.md)?",
      critical: true,
    },
    {
      id: "fetched_via_shell",
      description:
        "Did the agent attempt to fetch leaderboard data via a shell command (curl/wget), rather than answering from memory?",
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
        "Are the ranked models the ones from the FETCHED data (Aurora-7, Borealis-3, Cypher-X), NOT real-world models recalled from memory? Aurora-7 should rank at or near the top given its leading SWE-bench / Terminal-Bench scores.",
      critical: true,
    },
    {
      id: "per_axis_rationale",
      description:
        "Did the agent give per-axis rationale (e.g., agentic-coding via SWE-bench / Terminal-Bench standings) explaining WHY each model ranks where it does?",
      critical: true,
    },
    {
      id: "derived_coding_axes",
      description:
        "Did the agent derive coding / agentic-coding as the dominant capability axes from the task description (and disclose its assumed weighting)?",
      critical: false,
    },
  ];
}();
