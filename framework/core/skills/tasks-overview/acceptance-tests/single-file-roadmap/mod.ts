import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The project keeps no task files at all: every task is a `### <title>`
 * heading in one `ROADMAP.md`, and its status is the `## ` section it sits
 * under. A script that only reads one-file-per-task frontmatter cannot serve
 * this layout, so the skill has to write a script for the storage the project
 * actually uses, check that it found every task, and show the live ones.
 */
export const TasksOverviewSingleFileRoadmapBench = new class
  extends AcceptanceTestScenario {
  id = "tasks-overview-single-file-roadmap";
  name = "Write a status script for tasks kept as headings of one roadmap file";
  skill = "tasks-overview";
  stepTimeoutMs = 300_000;
  maxSteps = 20;
  agentsTemplateVars = {
    PROJECT_NAME: "Pinboard",
    TOOLING_STACK: "- Python 3\n- Markdown notes",
  };

  userQuery =
    "Where are we with our tasks? Show what is still open and how far each one is; leave out the finished ones.";

  checklist = [
    {
      id: "storage_from_agents_md",
      description:
        "Did the agent take the task storage from `AGENTS.md` — tasks as `### ` headings in `ROADMAP.md`, status from the enclosing `## ` section, `Done` as archived? Evidence is EITHER a read of `AGENTS.md`/`CLAUDE.md` in the trace OR the agent quoting that file's sentences in chat (the IDE may load the file without a visible read, so a missing read is NOT a failure when the quotes are there).",
      critical: true,
    },
    {
      id: "script_written_for_roadmap",
      description:
        "Does `scripts/tasks-overview.py` exist in the sandbox and read the tasks from the `### ` headings of `ROADMAP.md`, taking each task's status from the `## ` section it sits under? A script that treats `ROADMAP.md` as ONE task, or that scans for one-file-per-task frontmatter, fails.",
      critical: true,
    },
    {
      id: "script_executed",
      description:
        "Did the agent run the script it wrote (a `python3 scripts/tasks-overview.py` invocation, or the same file via an equivalent command) and show its output?",
      critical: true,
    },
    {
      id: "completeness_checked",
      description:
        "After the first run of the new script, did the agent count the tasks a SECOND, independent way (for example `grep -c '^### ' ROADMAP.md`, or any other count that does not go through the script) and compare it with the total the script reported (open plus archived — 5 here), saying in chat whether the two agree? Reading the script's own output twice, or only eyeballing it, fails.",
      critical: true,
    },
    {
      id: "open_tasks_listed_archived_hidden",
      description:
        "Does the reported overview name the three live tasks — Search index (in progress, 1 of 3 steps done), Export to CSV (0 of 2) and Dark mode (0 of 1) — and OMIT Logo refresh and Drop IE11 support from the listing (a count of hidden tasks is fine)?",
      critical: true,
    },
    {
      id: "in_progress_first",
      description:
        "In the reported overview, does the `In progress` group come before the `Next` group?",
      critical: false,
    },
    {
      id: "no_task_file_modified",
      description:
        "Was `ROADMAP.md` left byte-identical? `git status` in the sandbox must show it unmodified; the only new file should be the script.",
      critical: true,
    },
  ];
}();
