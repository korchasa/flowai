import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const MaintenanceBasicBench = new class extends BenchmarkSkillScenario {
  id = "af-maintenance-basic";
  name = "Basic Project Audit";
  skill = "af-maintenance";

  userQuery =
    "/af-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "whiteboard_report",
      description:
        "Did the agent create a maintenance report? (Check logs for whiteboard.md content)",
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
