import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceBasicBench = new class extends AcceptanceTestScenario {
  id = "flowai-maintenance-basic";
  name = "Basic Project Audit (Interactive)";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  interactive = true;
  userPersona =
    'You are a developer who wants to fix all issues. When asked how to proceed, say "all". When asked about individual fixes, say "Apply fix" for each one.';
  agentsTemplateVars = {
    PROJECT_NAME: "MaintenanceTarget",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "numbered_summary",
      description:
        "Did the agent present a numbered summary of findings (e.g., [1], [2], ...) grouped by category, before asking the user how to proceed?",
      critical: true,
    },
    {
      id: "asks_how_to_proceed",
      description:
        'Did the agent ask the user how to proceed after the summary (offering options like "all", specific numbers, category name, or "done")?',
      critical: true,
    },
    {
      id: "todo_found",
      description: "Did the findings identify the TODO in src/main.ts?",
      critical: true,
    },
    {
      id: "god_object_found",
      description:
        "Did the findings identify SystemManager as a God Object candidate?",
      critical: true,
    },
    {
      id: "unused_export_found",
      description: "Did the findings identify unusedExport?",
      critical: true,
    },
    {
      id: "interactive_resolution",
      description:
        "Did the agent enter an interactive resolution loop, asking the user about individual findings (apply/skip/edit)?",
      critical: true,
    },
    {
      id: "constructive_fixes",
      description:
        "Does every identified issue include a '(Fix: ...)' proposal or recommendation?",
      critical: false,
    },
    {
      id: "file_length_check",
      description:
        "Did the findings check for files exceeding 500 lines or functions exceeding 50 lines?",
      critical: false,
    },
  ];
}();
