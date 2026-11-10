---
date: 2026-11-10
status: done
implements:
  - FR-PACKS
  - FR-DOC-ANCHORS.HOOK
---
# Remove the packs nobody loads

## Goal

Stop shipping and maintaining framework packs that no session uses, so the
catalogue a user sees and the surface the project tests are the parts that
earn their keep.

## Overview

### Context

`scripts/flowai-skill-reads.py` counted skill loads over both Claude Code
config roots (`~/.claude`, `~/.claude-work`) for the 30 days ending
2026-11-10: 335 loads, 14 of 55 skills in use. Four packs had no skill load at
all: `beta`, `deno`, `memex`, `typescript`.

The count sees skills only. `beta` also shipped the `doc-anchors-validate`
Stop hook, which is in daily use: the pack was enabled in both accounts and
this project's own rules rely on the hook. The user chose to keep the hook by
moving it to `core` and to delete everything else in the four packs.

### Current State

- `framework/{beta,deno,memex,typescript}/` — 134 tracked files: 10 skills, the
  `worker` agent, the `doc-anchors-validate` and `status` hooks.
- `scripts/build-plugins.ts` `DEFAULT_PACKS` listed seven packs.
- Two trigger scenarios of surviving skills named a neighbour skill from a
  deleted pack: `engineer-rule-trigger-adj-1` (mounted `typescript`) and
  `setup-ai-ide-devcontainer-trigger-adj-1` (mounted `deno`).
- `IDE_NEUTRAL_EXEMPT` in `scripts/check-skills.ts` existed only for
  `ai-ide-runner`.

### Constraints

- The working tree holds another session's uncommitted edits in `README.md`,
  `documents/{requirements,design,index}.md` and `framework/AGENTS.md`; they
  stay untouched.
- Task files and `documents/rnd/` keep their mentions of the removed packs:
  they are records, not current state.

## Definition of Done

- [x] FR-PACKS: the four packs are gone from the source tree and from the build
  - Test: `scripts/build-plugins_test.ts::codex-marketplace emits-codex-marketplace-for-all-packs`
  - Evidence: `test "$(ls -d framework/*/pack.yaml | tr '\n' ' ')" = "framework/core/pack.yaml framework/devtools/pack.yaml framework/engineering/pack.yaml "`
- [x] FR-DOC-ANCHORS.HOOK: the hook ships in `core`
  - Test: `scripts/build-plugins_test.ts::core-pack ships-doc-anchors-stop-hook`
  - Evidence: `deno test -A scripts/build-plugins_test.ts framework/core/hooks/doc-anchors-validate/run_test.ts`
- [x] FR-ACCEPT.TRIGGER: both rewritten adjacent-skill scenarios pass
  - Benchmark: `engineer-rule-trigger-adj-1`, `setup-ai-ide-devcontainer-trigger-adj-1`
  - Evidence: `deno task acceptance-tests -f engineer-rule-trigger-adj-1` and `deno task acceptance-tests -f setup-ai-ide-devcontainer-trigger-adj-1`
- [x] FR-PACKS: no current-state document names a removed pack or its primitives
  - Test: manual — korchasa
  - Evidence: `! grep -nE 'flowai-(beta|deno|memex|typescript)|select-llm-model|setup-agent-code-style|FR-(MEMEX|MODEL-SELECT|AI-IDE-RUNNER|IDE-BRIDGE)' README.md AGENTS.md framework/AGENTS.md documents/requirements.md documents/index.md`
- [x] FR-PACKS: the project gate is green
  - Test: `deno task check`
  - Evidence: `deno task check > check.log 2>&1; tail -3 check.log`

## Solution

1. `git mv framework/beta/hooks/doc-anchors-validate framework/core/hooks/`,
   then `git rm -r` the four pack directories.
2. `scripts/build-plugins.ts`: `DEFAULT_PACKS` = `core`, `devtools`,
   `engineering`. `scripts/build-plugins_test.ts`: build the surviving packs,
   replace the two `beta` tests with one that asserts both Stop hooks in the
   `flowai` plugin.
3. `scripts/check-skills.ts`: drop `IDE_NEUTRAL_EXEMPT` and its test.
   `scripts/check-salp_test.ts`: import the hook from its new path.
4. Rewrite the two adjacent-skill scenarios onto neighbours that still exist:
   `engineer-hook` for `engineer-rule`, `configure-deno-commands` for
   `setup-ai-ide-devcontainer`. Run each once.
5. SRS: delete FR-AI-IDE-RUNNER, FR-IDE-BRIDGE-WORKER, FR-IDE-BRIDGE-DELEGATE,
   FR-MEMEX, FR-MODEL-SELECT and the references to them; FR-DOC-ANCHORS.HOOK
   says `core`; FR-RULES cites `agents-rules-*` scenarios. SDS: delete §3.14,
   §3.15, §3.17, §3.21, recount the inventory. README, `documents/index.md`,
   `framework/AGENTS.md`, `AGENTS.md`: the pack lists.
6. `deno task check`.
