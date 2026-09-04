---
name: tasks-overview
description: Show the current state of the project's tasks, hiding archived ones, by deriving the project's own task layout from AGENTS.md and generating a small project-local status script. Use when the user asks which tasks are open, in progress, or how far along the work is.
---

# Tasks Overview

## Overview

Every project keeps its tasks somewhere — a directory of Markdown files with a
status key in the frontmatter is the common shape, but the directory, the key
and the values differ from project to project. flowai proposes one layout
(the `tasks` role from AGENTS.md, by default a date-nested
`<tasks dir>/<YYYY>/<MM>/<slug>.md` tree with `status: to do | in progress |
done | superseded`) and many projects use their own. Reading every task file by
hand on every request is slow and inconsistent, so this skill turns the
project's convention into a script once, keeps that script in the project, and
runs it from then on.

The script is `scripts/tasks-overview.py`. It is the bundled template
`scripts/tasks_overview.py` (next to this file) with one block replaced: the
schema block that says where the tasks live and how to read them. Everything
else is unchanged scanning logic that needs only Python 3.

## Rules & Constraints

<rules>
1. **An existing script wins.** If the project already has
   `scripts/tasks-overview.py`, run it and report. Do not re-derive the schema
   and do not rewrite the file — the user owns it once it is in the project;
   if its output looks wrong, say so and leave the fix to the user.
2. **The project's convention beats the framework default.** AGENTS.md (or
   CLAUDE.md) is the source for the task layout. When it carries a
   project-specific section that overrides or contradicts the framework's
   default task rules, the project-specific one is the truth. The framework
   layout is only assumed when AGENTS.md carries no project-specific override
   of it.
3. **Never modify a task file.** This skill reads tasks; it does not fix
   frontmatter, flip statuses or move files. The only file it writes is the
   script.
4. **Only the schema block changes.** Copy the template as-is and replace the
   text between `# --- SCHEMA BEGIN ---` and `# --- SCHEMA END ---`. Do not
   edit the scanning logic, and do not write the script from scratch — the
   template is tested, a rewrite is not.
5. **Show the derivation, with quotes.** Before writing the script, state
   each schema key and QUOTE the AGENTS.md sentence it comes from (the words
   themselves, in quotation marks or a code span — not a paraphrase), so a
   wrong guess is caught before it becomes a script. A value with no quoted
   source is a guess and must be named as one.
6. **No guessed location.** If neither AGENTS.md nor the tree says where the
   tasks live, ask the user in one line and STOP. Do not scan the whole
   repository for anything that looks like a task.
7. **Fail loudly.** If `python3` is missing, or the script exits with 2,
   report the message and STOP — do not fall back to reading the files by hand.
</rules>

## Instructions

<step_by_step>

1. **Reuse gate.** Check for `scripts/tasks-overview.py` in the project root.
   - Present → run it exactly as in step 5 and skip steps 2–4. If the user
     asked for archived tasks too, pass `--all`.
   - Absent → continue.

2. **Derive the schema from AGENTS.md.** Read `AGENTS.md` (or `CLAUDE.md`
   when that is the file the project has). Find the rules about tasks:
   the `tasks` role in the documentation hierarchy, a "Tasks" section, or any
   sentence naming the task directory, the status key and its values. Apply
   Rule 2: a project-specific section that says the framework layout is
   superseded, or names a different directory, is the one to follow. Fill
   these keys (the template's comments explain each):
   - `root` — the task directory relative to the project root.
   - `pattern` — the glob under `root` that selects task files
     (`**/*.md` for nested layouts, `*.md` for a flat directory).
   - `ignore` — file names inside `root` that are not tasks (`README.md`
     and the like).
   - `status_key` — the frontmatter key that holds the status (`status`,
     `state`, …).
   - `missing_status` — the label to show when a file has no status key.
   - `archived_statuses` — every value that means the task is finished or
     retired (`done`, `superseded`, `closed`, `archived`, `dropped`, …).
   - `archived_dirs` — subdirectories of `root` whose files are archived
     whatever their status (`archive/`), or `[]`.
   - `progress_section` — the heading whose `- [ ]` / `- [x]` items measure
     progress (`## Definition of Done`, `## Checklist`, …), or `None` when
     the project has no such section.
   If AGENTS.md carries no project-specific task rules, use the flowai default
   (root `documents/tasks`, `**/*.md`, `status`, archived `done` + `superseded`,
   `## Definition of Done`) — but only after confirming that directory exists.
   If the location cannot be established, apply Rule 6.

3. **Show the derivation** (Rule 5): one line per key — the value and the
   quoted sentence from AGENTS.md it was taken from (or "framework default",
   named as such). Example:
   `status_key: state — "with frontmatter \`state: open | blocked | closed | archived\`"`.

4. **Write the project script.** Copy the template
   `scripts/tasks_overview.py` from this skill's directory to
   `scripts/tasks-overview.py` in the project root (create `scripts/` if
   needed), then replace only the schema block (Rule 4) with the derived
   values, keeping the `SCHEMA = { ... }` shape:

   ```bash
   mkdir -p scripts
   cp <this skill's directory>/scripts/tasks_overview.py scripts/tasks-overview.py
   ```

   Then edit the block between `# --- SCHEMA BEGIN ---` and
   `# --- SCHEMA END ---` in `scripts/tasks-overview.py`.

5. **Run it and report.**

   ```bash
   python3 scripts/tasks-overview.py
   ```

   Add `--all` when the user wants archived tasks too. The output groups tasks
   by status (`in progress`, `to do`, then the rest), one line per task with
   the path, the progress (`[done/total]` when a progress section exists),
   the title and the date, and ends with `N open, M archived (hidden; use
   --all)`. Exit 2 means the root is missing, the schema block is malformed,
   or a file could not be read — the message names the path; apply Rule 7.
   Paste the script's output VERBATIM in a fenced code block in your reply —
   the user sees your message, not the tool result, and a retelling of the
   list is not the list. Comments or a short reading of it may follow the
   block, never replace it. When the script was just created, add one
   sentence saying that `scripts/tasks-overview.py` now lives in their
   project and is theirs to edit — the next request will run it directly.

</step_by_step>

## Resources

- [`scripts/tasks_overview.py`](scripts/tasks_overview.py) — the template; its schema block is the only project-specific part.
