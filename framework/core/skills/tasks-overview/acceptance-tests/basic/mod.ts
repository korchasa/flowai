import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The project's task convention differs from the framework default: tasks
 * sit in `docs/todo/<slug>.md` with a `state:` key. The skill must derive
 * that convention from AGENTS.md, write a project-local script for it, run
 * it and show only the non-archived tasks — without touching any task file.
 */
export const TasksOverviewBasicBench = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-basic";
  name = "Derive the project's task schema and show open tasks";
  skill = "tasks-overview";
  stepTimeoutMs = 300_000;
  maxSteps = 20;
  agentsTemplateVars = {
    PROJECT_NAME: "TodoService",
    TOOLING_STACK: "- Python 3\n- Markdown notes",
  };

  userQuery =
    "Show me the current state of our tasks — which ones are still open and how far along they are. Skip the archived ones.";

  interactive = true;
  userPersona =
    "You are the maintainer of TodoService. If the agent asks where the tasks live or which convention to use, answer: use the docs/todo convention from AGENTS.md. If it asks anything else, say 'your call' and keep answers to one sentence.";

  checklist = [
    {
      id: "schema_from_agents_md",
      description:
        "Did the agent take the task convention from `AGENTS.md` rather than from guessing? Evidence is EITHER a read of `AGENTS.md`/`CLAUDE.md` in the trace OR the agent quoting that file's sentences in chat (the IDE may load the file as project instructions without a visible read, so a missing read is NOT a failure when the quotes are there). A schema explained only from the shape of the files under `docs/todo/`, with no reference to `AGENTS.md`, fails.",
      critical: true,
    },
    {
      id: "script_written_with_project_schema",
      description:
        "Does `scripts/tasks-overview.py` exist in the sandbox with a schema block whose `root` is `docs/todo`, whose `status_key` is `state`, and whose `archived_statuses` include both `closed` and `archived`?",
      critical: true,
    },
    {
      id: "derivation_shown",
      description:
        "Before or while writing the script, did the agent state in chat how it derived the schema — quoting the AGENTS.md sentence(s) that gave the task directory, the status key, and the archived states?",
      critical: false,
    },
    {
      id: "script_executed",
      description:
        "Did the agent run the script it wrote (a `python3 scripts/tasks-overview.py` invocation, or the same file via an equivalent command) and show its output?",
      critical: true,
    },
    {
      id: "open_tasks_listed_archived_hidden",
      description:
        "Does the reported overview name the two live tasks (the response cache task with state `open` and the signing-keys task with state `blocked`) with their checklist progress, and OMIT the closed login-typo task and the archived legacy-queue task from the listing (a count of hidden tasks is fine)?",
      critical: true,
    },
    {
      id: "no_task_file_modified",
      description:
        "Were all four files under `docs/todo/` left byte-identical? `git status` in the sandbox must show no change under `docs/todo/`; the only new file should be the script (plus nothing else the user did not ask for).",
      critical: true,
    },
    {
      id: "no_framework_default_assumed",
      description:
        "Did the agent AVOID scanning or creating `documents/tasks/` (the framework default layout that AGENTS.md says is superseded here)? A script pointed at `documents/tasks` or a chat claim that the project has no tasks fails this item.",
      critical: true,
    },
  ];
}();
