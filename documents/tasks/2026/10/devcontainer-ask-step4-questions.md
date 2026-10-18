---
date: 2026-10-18
status: done
implements:
  - FR-DEVCONTAINER
---
# Devcontainer skill asks its questions instead of picking defaults

## Goal

`setup-ai-ide-devcontainer` must show the discovered features and ask the capability questions the request left open before it writes any file. Otherwise the user never sees what was detected, and the agent decides on the user's behalf whether the container gets a firewall (extra Linux capabilities) or a read-only view of the host AI config.

## Overview

### Context

The full claude-arm sweep of 2026-10-18 (run `2026-10-18T14-45-21`, agent and judge `claude-sonnet-5-5`) left two scenarios of this skill red:

- `setup-ai-ide-devcontainer-feature-discovery`, item `feature_suggestions_shown`. The same item failed in the `-f setup-ai-ide-devcontainer` sweep earlier that day (run `2026-10-18T11-19-11`).
- `setup-ai-ide-devcontainer-brownfield`, item `pip_install`. The agent offered to leave the dependency step out, saying `pip install -e .` "would probably fail", and the persona took the recommended option.

### Current State

feature-discovery, on HEAD before the fix: 0 of 3 (run `2026-10-18T17-30-29-2`), and 0 of 2 earlier that day. In all five raw sessions the agent ends no turn before writing: it never shows the grouped list and never asks the Step 4 questions. One closing summary says "you didn't say, so there is no firewall and no custom Dockerfile". The Step 2 rule "Present it BEFORE writing any file" already existed (added in `f352ac30`, 3 of 3 on codex then). The request's "accept all suggested features" waives the wait, and with the Step 4 questions answered by their "(default)" labels nothing was left to stop for. The project rule "forward motion after authorization" in the sandbox AGENTS.md points the same way.

The failed Claude sessions could not be interviewed: `claude -p --resume` was refused twice by the model's safeguard filter (`[reasoning_extraction]`), including a copy-edit phrasing.

Layer: the skill. The persona answers every Step 4 question and pre-accepts the features. The checklist asks for the presentation the skill promises.

brownfield, on HEAD before the fix: 3 of 3 (run `2026-10-18T17-30-29`), 4 of 5 over the day. The agent's claim was false: `pip install -e .` on the fixture's `pyproject.toml` in `python:3.12-alpine` exits 0 and installs flask 3.1.3. The user chose to leave this rare flake alone: no edit can be shown red on it.

### Constraints

- Do not change the personas or checklists (no test-fitting).
- Do not touch `framework/core/assets/AGENTS.template.md` or `scripts/acceptance-tests/lib/` — both are in every scenario's cache key.
- Variant chosen by the user: Step 4 questions are asked, never defaulted, in one message with the Step 2 list, which ends the turn.

## Definition of Done

- [x] FR-DEVCONTAINER: on the pre-fix skill, `setup-ai-ide-devcontainer-feature-discovery` fails across `-n 3`.
  - Benchmark: `setup-ai-ide-devcontainer-feature-discovery`
  - Evidence: `deno task acceptance-tests -f setup-ai-ide-devcontainer-feature-discovery -n 3 -p 3` → 0/3, run `2026-10-18T17-30-29-2`.
- [x] FR-DEVCONTAINER: after the fix, the same scenario passes 3 of 3, and every raw session shows a user turn before the first file write.
  - Benchmark: `setup-ai-ide-devcontainer-feature-discovery`
  - Evidence: the same command → 3/3, run `2026-10-18T17-46-12`; each run's `.jsonl` has the persona's answer before the first `Write` or heredoc.
- [x] FR-DEVCONTAINER: `setup-ai-ide-devcontainer-brownfield` still passes after the fix.
  - Benchmark: `setup-ai-ide-devcontainer-brownfield`
  - Evidence: `deno task acceptance-tests -f setup-ai-ide-devcontainer-brownfield -n 3 -p 3` → 2/3 (PASS), run `2026-10-18T17-51-21`; see Results for the one judge misread.
- [x] The gate stays green.
  - Evidence: `deno task check > log 2>&1`: both test summaries `0 failed`, check-skills and check-task-format PASS. The three failing steps at that moment were files of parallel sessions (a syntax error in `framework/core/acceptance-tests/agents-rules-chat-source/mod.ts`, and `implements: FR-PLAN-HANDS-OFF` in an uncommitted task file), none touched here.

## Solution

1. Step 4 of `framework/core/skills/setup-ai-ide-devcontainer/SKILL.md`: ask every unanswered item and stop; a "(default)" label is the recommendation inside the question, not an answer; "accept all suggested features" answers Step 2 only; the forward-motion rule does not reach these questions; ask them in ONE message with the Step 2 list (and the Step 3 questions) and end the turn.
2. Step 2: the presentation goes into that same message; only when the request answered every Step 4 item too is it a message of its own with no stop.

## Results

- feature-discovery: 0/3 before → 3/3 after.
- brownfield: 3/3 before → 2/3 after (run `2026-10-18T17-51-21`, PASS at the 2/3 threshold). The one red is the judge: run-3 failed `diff_shown` with "the diff output never appeared in any user-facing message", while that run's second reply holds a full unified-diff block of `devcontainer.json` before "Confirm before I write?", and `judge-evidence.md` line 92 shows it. All three runs kept `pip install -e .`.
- The other execution scenarios of the skill (`node-basic`, `deno-claude`, `deno-flowai-plugins`, `opencode-multi-cli`) and the three trigger scenarios were not re-run here; their personas answer every Step 4 question. Full sweep for the user: `deno task acceptance-tests -f setup-ai-ide-devcontainer`.
