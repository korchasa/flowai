import { BenchmarkScenario } from "../../../lib/types.ts";

const SKILL_PATH = "catalog/skills/af-maintenance/SKILL.md";

export const MaintenanceBasicBench: BenchmarkScenario = {
  id: "af-maintenance-basic",
  name: "Basic Project Audit",
  targetAgentPath: SKILL_PATH,
  skillName: "af-maintenance",

  setup: async (_sandboxPath: string) => {
    // Fixtures are copied automatically
  },

  userQuery: "/af-maintenance. Use only standard CLI tools like cat, ls, grep.",

  checklist: [
    {
      id: "whiteboard_report",
      description:
        "Did the agent create a maintenance report? (Check logs for whiteboard.md content)",
      critical: true,
      type: "semantic",
    },
    {
      id: "todo_found",
      description: "Did the report identify the TODO in src/main.ts?",
      critical: true,
      type: "semantic",
    },
    {
      id: "god_object_found",
      description:
        "Did the report identify SystemManager as a God Object candidate?",
      critical: true,
      type: "semantic",
    },
    {
      id: "unused_export_found",
      description: "Did the report identify unusedExport?",
      critical: true,
      type: "semantic",
    },
  ],
};
