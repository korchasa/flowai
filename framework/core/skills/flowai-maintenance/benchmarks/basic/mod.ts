import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceBasicBench = new class extends BenchmarkSkillScenario {
  id = "flowai-maintenance-basic";
  name = "Basic Project Audit";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MaintenanceTarget",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "whiteboard_report",
      description:
        "Did the agent create a maintenance report in 'documents/whiteboards/'? (Check logs for whiteboard content)",
      critical: true,
    },
    {
      id: "todo_found",
      description: "Did the report identify the TODO in src/main.ts?",
      critical: true,
    },
    {
      id: "god_object_found",
      description:
        "Did the report identify SystemManager as a God Object candidate?",
      critical: true,
    },
    {
      id: "unused_export_found",
      description: "Did the report identify unusedExport?",
      critical: true,
    },
    {
      id: "constructive_fixes",
      description:
        "Does every identified issue in the report have a 'Proposed Fix' or recommendation?",
      critical: false,
    },
    {
      id: "report_path_format",
      description:
        "Is the report saved to 'documents/whiteboards/YYYY-MM-DD-maintenance.md' with a timestamped header?",
      critical: false,
    },
    {
      id: "file_length_check",
      description:
        "Did the report check for files exceeding 500 lines or functions exceeding 50 lines?",
      critical: false,
    },
  ];
}();
