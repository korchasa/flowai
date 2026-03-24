import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const MaintenanceBasicBench = new class extends BenchmarkSkillScenario {
  id = "flow-maintenance-basic";
  name = "Basic Project Audit";
  skill = "flow-maintenance";
  stepTimeoutMs = 180_000;

  userQuery =
    "/flow-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "whiteboard_report",
      description:
        "Did the agent create a maintenance report in 'documents/whiteboards/'? (Check logs for whiteboard content)",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "todo_found",
      description: "Did the report identify the TODO in src/main.ts?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "god_object_found",
      description:
        "Did the report identify SystemManager as a God Object candidate?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "unused_export_found",
      description: "Did the report identify unusedExport?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
