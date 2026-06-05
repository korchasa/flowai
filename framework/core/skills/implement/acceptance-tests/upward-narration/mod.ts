import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * FR-UPWARD-NARRATION. The agent implements a small, fully-specified plan
 * (a `slugify` helper) under TDD, then must narrate the result UPWARD — in
 * requirements + class/method terms (name, responsibility, relationships) —
 * so the human can accept the work WITHOUT reading the diff. A bare "files
 * changed" report or a "review the diff to see what changed" hand-off fails
 * the decision-level checklist.
 */
export const ImplementUpwardNarration = new class
  extends AcceptanceTestScenario {
  id = "implement-upward-narration";
  name = "Final summary narrates class/method structure, not a diff";
  skill = "implement";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Slugger",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/implement Execute the Solution in documents/tasks/2026/05/add-slugify.md under TDD.";

  userPersona =
    `You are a developer who wrote the plan and now wants the agent to implement it under TDD.
You do NOT read code and will NOT open diffs — you rely entirely on the agent's spoken summary.
When the agent asks questions or proposes a plan, confirm briefly and let it proceed.
When shown the final summary, acknowledge it. Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "narrates_function_responsibility",
      description:
        "Does the agent's FINAL summary describe, in plain prose, the function it added (`slugify`) and its responsibility/behaviour (what it does to the input) — understandable WITHOUT reading the code?",
      critical: true,
    },
    {
      id: "no_mandatory_diff_read",
      description:
        "Can the human accept the work from the summary ALONE — i.e. the agent does NOT make reading the diff/code the required way to understand what changed (no 'review the diff'/'see the changes in X' as the sole explanation)?",
      critical: true,
    },
    {
      id: "decisions_or_none",
      description:
        "Does the summary state the above-class/method decisions made, OR explicitly note there were none (purely local implementation)?",
      critical: false,
    },
    {
      id: "tdd_followed",
      description:
        "Is a RED→GREEN cycle observable in the trace (a failing test written and run before the implementation)?",
      critical: false,
    },
  ];
}();
