import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const AdaptInstructionsNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-instructions-no-spurious-invocation";
  name = "Adapt-Instructions — No Spurious Auto-Invocation";
  skill = "flowai-adapt-instructions";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Add one line to AGENTS.md under 'Project tooling Stack' that mentions Docker.";

  checklist = [
    {
      id: "no_template_diff",
      description:
        "Did the agent NOT read {ide}/assets/AGENTS.template.md to diff it against the project AGENTS.md? A small targeted edit must not trigger the template re-adaptation workflow.",
      critical: true,
    },
    {
      id: "no_merge_proposal",
      description:
        "Did the agent NOT produce a full merge proposal with per-section classification (framework-originated vs project-specific) and a confirmation prompt?",
      critical: true,
    },
    {
      id: "direct_edit",
      description:
        "Did the agent add the requested Docker line to AGENTS.md directly (targeted edit, preserving surrounding content)?",
      critical: true,
    },
  ];
}();
