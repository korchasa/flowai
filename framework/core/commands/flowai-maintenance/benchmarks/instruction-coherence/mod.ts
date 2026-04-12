import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceInstructionCoherenceBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-maintenance-instruction-coherence";
  name = "Instruction Coherence Check (Interactive)";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  interactive = true;
  userPersona =
    'You are a developer who wants to fix coherence issues. When asked how to proceed, say "Instruction Coherence". When asked about individual fixes, say "Apply fix" for each one.';
  agentsTemplateVars = {
    PROJECT_NAME: "CoherenceTarget",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "numbered_summary",
      description:
        "Did the agent present a numbered summary of findings grouped by category, before asking the user how to proceed?",
      critical: true,
    },
    {
      id: "asks_how_to_proceed",
      description:
        'Did the agent ask the user how to proceed after the summary (offering options like "all", specific numbers, category name, or "done")?',
      critical: true,
    },
    {
      id: "indentation_contradiction",
      description:
        "Did the report identify the contradiction between 'tabs' and '2 spaces' for indentation in CLAUDE.md?",
      critical: true,
    },
    {
      id: "naming_contradiction",
      description:
        "Did the report identify the contradiction between 'camelCase' and 'snake_case' naming conventions in CLAUDE.md?",
      critical: true,
    },
    {
      id: "mock_contradiction",
      description:
        "Did the report identify the contradiction between 'never mock' and 'mock freely' in CLAUDE.md?",
      critical: true,
    },
    {
      id: "coherence_section",
      description:
        "Does the report have a dedicated section for instruction coherence issues (contradictions, ambiguities)?",
      critical: true,
    },
    {
      id: "interactive_resolution",
      description:
        "Did the agent enter an interactive resolution loop for the coherence findings, asking the user about individual findings (apply/skip/edit)?",
      critical: true,
    },
    {
      id: "constructive_fixes",
      description:
        "Does every coherence issue have a proposed fix or recommendation to resolve the contradiction?",
      critical: false,
    },
  ];
}();
