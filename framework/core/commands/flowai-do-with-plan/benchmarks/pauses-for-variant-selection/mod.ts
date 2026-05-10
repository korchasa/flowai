import { BenchmarkSkillScenario } from "@bench/types.ts";

// Verifies the Plan -> Implement gate: agent must surface variant analysis and
// pause for user selection BEFORE filling the Solution section. Targets only
// Plan Phase behavior — user emulator does NOT answer the variant prompt
// quickly enough to advance the test, so the run terminates with the agent
// still in Plan Phase awaiting input. We then judge whether the variant
// analysis surfaced.
export const DoWithPlanVariantSelectionBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-do-with-plan-pauses-for-variant-selection";
  name = "Plan Phase pauses for variant selection";
  skill = "flowai-do-with-plan";
  maxSteps = 60;
  stepTimeoutMs = 600_000;
  totalTimeoutMs = 1_200_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to pick a planning variant, answer 'Variant A' (or the first option). For ALL subsequent agent prompts after variant selection — including approval requests, doc-sync confirmations, commit prompts, end-of-flow questions — answer concisely with 'Yes' or 'OK, proceed'. Never refuse, never request unrelated work, never abort early. Keep replies under 10 words.";

  userQuery =
    "/flowai-do-with-plan Add a configurable retry policy (count + backoff) to the existing http_client.ts module. Touches FR-RETRY.";

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent enters Plan Phase, presents variant analysis with at least one variant detailed (Pros/Cons/Risks/Best For), then asks the user to pick. Agent does NOT proceed to fill `## Solution` until user replies.",
  };

  checklist = [
    {
      id: "variant_analysis_emitted",
      description:
        "Did the agent emit a variant analysis block in chat with at least one named variant containing Pros/Cons/Risks (per AGENTS.md `Variant Analysis`)?",
      critical: true,
    },
    {
      id: "explicit_variant_question",
      description:
        "Did the agent explicitly ask the user which variant to pick (a question that pauses the workflow)? The transcript should show a clear request for user input.",
      critical: true,
    },
    {
      id: "no_solution_before_selection",
      description:
        "Before the user replied to the variant question, did the agent NOT fill the `## Solution` section in the task file? Inspect the task-file write history — Solution should remain a placeholder until after the user picks.",
      critical: true,
    },
    {
      id: "task_file_skeleton_written",
      description:
        "Did the agent write the task file skeleton (frontmatter + Goal/Overview/DoD) BEFORE the variant question — so a partially-drafted task exists at `documents/tasks/<YYYY>/<MM>/<slug>.md`?",
      critical: false,
    },
  ];
}();
