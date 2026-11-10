---
name: skill-reads
description: Count how often each flowai framework skill was loaded into Claude Code sessions, across both config roots (~/.claude and ~/.claude-work), over the last N days. Use when the user asks which flowai skills are really used or read, or which are never loaded. Triggers on "skill reads", "чтения скилов", "/skill-reads".
---

# flowai skill reads

One command over the session transcripts of both Claude Code accounts. The
script is `scripts/flowai-skill-reads.py` (Python 3, stdlib only). It only
reads files; it never writes into either config root.

## Workflow

### 1. Build the catalogue if it is missing

The list of skills comes from the local plugin build,
`dist/claude-plugins/plugins/<pack>/skills/<name>/SKILL.md`. When that
directory is absent the script exits 2 and says so; run
`deno task build-plugins` and repeat.

### 2. Run the script

```bash
python3 scripts/flowai-skill-reads.py
```

Options:

- `--days N` — window in days (default 30).
- `--config-root DIR` — repeatable; replaces the default pair `~/.claude`,
  `~/.claude-work`.
- `--json` — one JSON object per skill, for further processing with `jq`.

A run over about 7 GB of transcripts takes about a minute. Write the output to
a file and read it from there; do not re-run for another slice.

### 3. Relay the report

Paste the table as a fenced block, then read it in plain language:

- **loads** — the number of times the skill body was put into a session's
  context. This is the figure to quote as "reads".
- **sessions**, **projects** — distinct sessions and distinct working
  directories behind those loads. Many loads in few sessions means one long
  session re-loading the skill.
- one column per config root — the split between the accounts.
- **tool** and **slash** — how the load was triggered: the model called the
  skill tool, or the user typed `/<pack>:<name>`. Their sum is close to
  `loads`.
- **source** — which copy was loaded: `local build` is this checkout's `dist/`
  (the dogfooding marketplace), `<marketplace> <version>` is an installed
  plugin, `project copy` is a skill copied into a project's own skills
  directory under a framework skill's name.
- **never loaded** — catalogue skills with no load in the window.
- `[not in catalogue]` — a load of a skill the current build no longer ships
  (renamed or removed).

### 4. Verify a surprising zero

Before reporting that a well-known skill was never loaded, confirm it with a
wider window (`--days 90`). A zero that turns non-zero there means the skill
fell out of use inside the window, which is a finding of its own.

## What counts as a load

A load is a user-type record whose text starts with
`Base directory for this skill: <dir>`; Claude Code writes one each time it
injects a skill body. The script parses every candidate line as JSON and checks
the record type and the start of the text, because the same words also occur
inside commands, tool results and quoted transcripts, and a plain text search
counts those as loads. Each record is filtered by its own timestamp, not by the
file's modification time (a long-lived transcript holds months of records), and
de-duplicated by `uuid`, since a resumed or forked session repeats its parent's
records.

## Limits

- Claude Code only. Codex, Cursor and OpenCode sessions are not scanned.
- Acceptance-test and benchmark sandboxes run with their own home directory,
  so their loads are not in either config root and are not counted.
- A skill the model read with a plain file read, without loading it as a
  skill, is not counted.
