import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceInstructionCoherenceBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-maintenance-instruction-coherence";
  name = "Instruction Coherence Check";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "CoherenceTarget",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "task_file_report",
      description:
        "Did the agent create a maintenance report in 'documents/tasks/'?",
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
      id: "constructive_fixes",
      description:
        "Does every coherence issue have a proposed fix or recommendation to resolve the contradiction?",
      critical: false,
    },
  ];
}();
