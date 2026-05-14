import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EpicNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-epic-no-spurious-invocation";
  name = "Epic — No Spurious Auto-Invocation";
  skill = "flowai-epic";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "What is an 'epic' in agile project management? Just define the term.";

  checklist = [
    {
      id: "no_epic_file",
      description:
        "Did the agent NOT create documents/tasks/epic-*.md? A definitional question must not trigger the epic-specification workflow.",
      critical: true,
    },
    {
      id: "no_phase_decomposition",
      description:
        "Did the agent NOT produce a phased decomposition with Goal / Non-Goals / Architecture & Boundaries / Phase N sections?",
      critical: true,
    },
    {
      id: "definitional_answer",
      description:
        "Did the agent answer with a short definition of 'epic' (agile usage), rather than entering the flowai-epic workflow?",
      critical: true,
    },
  ];
}();
