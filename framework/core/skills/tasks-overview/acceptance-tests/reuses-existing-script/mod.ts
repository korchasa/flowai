import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * A project that already went through the skill once ships
 * `scripts/tasks-overview.py` with its own schema. The skill must run that
 * script as-is — no re-derivation, no rewrite — and report its output.
 */
export const TasksOverviewReusesExistingScriptBench = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-reuses-existing-script";
  name = "Reuse the project's existing task overview script";
  skill = "tasks-overview";
  stepTimeoutMs = 300_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "Notesy",
    TOOLING_STACK: "- Python 3",
  };

  userQuery =
    "What's the status of our tasks right now? Only the ones still in play.";

  checklist = [
    {
      id: "existing_script_executed",
      description:
        "Did the agent run the existing `scripts/tasks-overview.py` (a `python3 scripts/tasks-overview.py` invocation or equivalent) instead of writing a new one?",
      critical: true,
    },
    {
      id: "script_unchanged",
      description:
        "Is `scripts/tasks-overview.py` byte-identical to the fixture version? `git status` in the sandbox must show it unmodified, and no second overview script (any other new file under `scripts/`) may have been created.",
      critical: true,
    },
    {
      id: "output_reported",
      description:
        "Does the agent's reply present the script's result: the two open tasks (search index, onboarding doc) with their step progress, while the done logo task and the dropped dark-mode task are absent from the listing (a hidden-count line is fine)?",
      critical: true,
    },
    {
      id: "no_task_file_modified",
      description:
        "Were all files under `tasks/` left unchanged (`git status` shows nothing under `tasks/`)?",
      critical: true,
    },
  ];
}();
