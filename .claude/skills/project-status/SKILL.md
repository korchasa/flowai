---
name: project-status
description: Show the current state of this project in one report — open and in-progress tasks, the newest acceptance-test verdict per scenario, and SWE-rebench benchmark pass rates per result cell. Use when the user asks how the project is doing, what is open, which acceptance tests are red, or what the benchmarks say. Triggers on "project status", "состояние проекта", "/project-status".
---

# Project Status

One command, three blocks: tasks, acceptance tests, benchmarks. The script is
`scripts/project-status.py` (Python 3, stdlib only). It reads only files that
are already on disk — it never runs a scenario or a benchmark.

## Workflow

### 1. Run the script

```bash
python3 scripts/project-status.py --failing
```

Options:

- `--failing` — list only red scenarios (`FAIL`) and green ones that carry warnings (`WARN`, a failed non-critical item); all packs still show pass/fail totals (recommended).
- `--top N` — cap the task list at N entries per status group (default 10).
- no flags — list every acceptance scenario, green ones included.

Exit 2 means a data directory is missing or a file could not be parsed; the
message names the path. Report it and stop — do not guess numbers.

### 2. Relay the report

Paste the script output into the reply as a fenced block, then add a short
reading of it in plain language:

- **Tasks** — the open (`to do`) and `in progress` task files with their
  Definition-of-Done progress `[done/total]`. Name the in-progress ones first;
  they are the work someone is in the middle of.
- **Acceptance tests** — pass/fail totals per pack, then the `FAIL` rows and
  the `WARN` rows (green, but a non-critical checklist item failed) with the
  items named. Each line is the newest cached verdict for that scenario
  (`acceptance-tests/cache/<pack>/<scenario>/<ide>.json`). Two limits of that
  source, verified 2026-09-07: the runner writes the cache only when a run
  succeeds, so a `FAIL` row cannot come from the cache and a scenario that
  never passed simply has no row; and a `-n 3` re-measure writes nothing
  unless `--cache-with-runs` is passed, so a green triple run leaves the old
  date in place. A verdict older than the primitive it tests may be stale: the
  cache key is invalidated on edit, so an old date means "not re-run since",
  not "still true". The `latest run` line names the scenarios of the most
  recent sweep.
- **Benchmarks** — per result cell (`scripts/benchmark/cells/<id>/`), resolved
  over measured instances per rep and overall. The `baseline` and `flowai`
  cells with the same model, effort and emulator are the pair to compare; the
  `framework` hash says which framework commit the flowai arm ran.

### 3. Point to the next action

Close with what the numbers suggest, one line each, only when it applies:

- red scenarios → `deno task acceptance-tests -f <scenario-id>` to re-run one,
  or the `root-cause-and-fix` skill when the cause is unknown.
- a cell with `pending` instances → the campaign did not finish; see
  `deno task benchmark cells-show` and the campaign's `driver.log` under
  `scripts/benchmark/runs/`.
- stale acceptance dates after a framework change → a fresh sweep
  (`acceptance-tests-all` skill).

## Data sources

- Tasks: `scripts/tasks-overview.py` (the script shells out to it and trims
  each status group to `--top`).
- Acceptance: `acceptance-tests/cache/*/*/*.json` — newest `recordedAt` per
  scenario across IDEs; `acceptance-tests/runs/latest` for the last sweep.
- Benchmarks: `scripts/benchmark/cells/*/cell.json` + `tasks.jsonl` (later
  rows win per rep/instance, as in `summariseCells`).
