---
date: 2026-11-10
status: done
implements:
  - FR-PACKS
---
# Remove eleven skills the agent works without

## Goal

Stop shipping skills whose work the agent already does unaided or through a
tool built into the IDE, so the skill list the model sees is spent on skills
that change the outcome.

## Overview

### Context

`scripts/flowai-skill-reads.py` showed 22 skills with no load in 90 days over
both Claude Code config roots. For 15 of them the transcripts of the same 90
days were scanned for the work each skill covers:

- browser tools were used in 805 sessions, `browser-automation` loaded 0 times;
- rule files were edited in 175 sessions, `engineer-rule` loaded 0 times;
- prompt files were edited in 20 sessions, neither prompt skill loaded;
- `/context` was called 18 times against `analyze-context`, and the user's own
  `fix-text-style` 94 times against `write-in-informational-style`;
- hook files were edited in 6 sessions and one plugin manifest in 1, all without
  `engineer-hook`, `engineer-ai-ide-plugin`, `engineer-plugin-hooks`,
  `engineer-plugin-mcp`; Claude Code's own `update-config` and
  `plugin-authoring` cover that work;
- no IDE slash command file was written; the framework dropped its own
  `commands/` kind on 2026-10-06, which leaves `engineer-command` without a
  subject.

The comparison is "the work was done without the skill", not "done as well as
with it"; no judged run without the skill was made. The user chose to delete
these eleven.

### Current State

- `framework/engineering/skills/`: 15 skills, 8 of them removed here.
- `framework/devtools/skills/`: 6 skills, 3 of them removed here.
- `engineer-plugin-marketplace` routed adjacent work to three of the removed
  skills in its body, its `references/related-skills.md`, and two scenarios.
- `engineer-skill-trigger-adj-1` named `engineer-command` as the neighbour.

### Constraints

- The working tree holds another session's uncommitted edits in `README.md`,
  `documents/{requirements,design,index}.md` and `framework/AGENTS.md`; they
  stay untouched.
- Task files, `CHANGELOG.md` and test comments keep their mentions of the
  removed skills: they are records, not current state.

## Definition of Done

- [x] FR-PACKS: the eleven skill directories are gone
  - Test: manual — korchasa
  - Evidence: `test "$(ls framework/devtools/skills framework/engineering/skills | grep -cE '^(browser-automation|analyze-context|write-in-informational-style|engineer-prompts-for-(instant|reasoning)|engineer-(rule|hook|command)|engineer-ai-ide-plugin|engineer-plugin-(hooks|mcp))$')" = 0`
- [x] FR-PACKS: no current-state document lists a removed skill
  - Test: manual — korchasa
  - Evidence: `! grep -nE 'browser-automation|analyze-context|write-in-informational-style|engineer-prompts-for|engineer-rule|engineer-hook|engineer-ai-ide-plugin|engineer-plugin-(hooks|mcp)' README.md documents/design.md framework/devtools/pack.yaml framework/engineering/skills/engineer-plugin-marketplace/SKILL.md framework/engineering/skills/engineer-plugin-marketplace/references/related-skills.md`
- [x] FR-ACCEPT.TRIGGER: the scenarios that named a removed neighbour pass
  - Benchmark: `engineer-plugin-marketplace-trigger-adj-1`, `engineer-skill-trigger-adj-1`, `engineer-plugin-marketplace-basic`
  - Evidence: `deno task acceptance-tests -f <scenario-id> --no-cache` for each of the three
- [x] FR-PACKS: the project gate is green
  - Test: `deno task check`
  - Evidence: `deno task check > check.log 2>&1; grep -E 'passed \|' check.log`

## Solution

1. `git rm -r` the eleven skill directories.
2. `engineer-plugin-marketplace`: the body and `references/related-skills.md`
   route only to skills that still exist; `basic` asks for links to
   `engineer-skill`, `engineer-subagent`, `write-agent-benchmarks`;
   `trigger-adj-1` takes `engineer-skill` as the neighbour and mounts the
   `devtools` pack through `extraPacks`.
3. `engineer-skill-trigger-adj-1`: the comment says no skill covers a slash
   command. `framework/devtools/pack.yaml`: the description.
4. README pack lists; SDS inventory counts (34 skills: 24 `core`, 3 `devtools`,
   7 `engineering`) and the `extraPacks` user; SRS: the `extraPacks` user and
   the list of question-asking skills.
5. `deno task check`, then one run of each changed scenario.
