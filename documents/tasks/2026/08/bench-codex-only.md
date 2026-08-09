---
date: 2026-08-09
status: done
implements:
  - FR-BENCH-SWE.IDE
  - FR-BENCH-SWE.ISOLATION
  - FR-BENCH-SWE.COST
  - FR-BENCH-SWE.SYMMETRY
  - FR-BENCH-SWE.WEBAUDIT
---

# Benchmark runs on codex only — retire the Claude subject arm

## Goal

Every live campaign already runs on codex, but the harness still defaults to
Claude and keeps a second, Claude-shaped implementation of cost capture and web
audit that produces nothing on the path we actually use. One subject IDE, one
implementation. Claude may return later as a subject; the door stays documented,
the code does not stay maintained.

## Overview

### Context

User decision 2026-08-09: "используется только codex … пока весь claude можно
выпилить, чтобы не поддерживать 2 реализации". Scope boundary set in the same
exchange: this covers `scripts/benchmark/` ONLY. The acceptance-test
infrastructure (`scripts/acceptance-tests/`) keeps `claude -p` — its judge and
user emulator run there, and it is the only way framework primitives are tested.

Two prior answers folded in: the pool2 funnel task is superseded by the frozen
codex pool (`scripts/benchmark/pools/codex-terra-medium.json`, 15 instances,
frozen 2026-07-26), and codex session counters are to be ported for real rather
than the pending item rewritten away.

### Current State

- Subject IDE defaults to Claude in two places: `benchmark.ts` `--ide` option
  default and `run.ts` `opts.ide ?? "claude"`.
- Cost + web audit run only when `ide === "claude"` (`run.ts` guard
  `canHarvestTranscripts`), because both readers parse Claude Code transcripts
  under `bench-home/.claude/projects/**/*.jsonl` (`metrics.ts`, `webaudit.ts`).
  On codex both print "unavailable" and write no file. So on the live path there
  is no cost measurement and no web audit at all.
- Codex writes its own counters: `CODEX_HOME/sessions/**/rollout-*.jsonl`, key
  `total_token_usage` (`input_tokens`, `cached_input_tokens`, `output_tokens`,
  `reasoning_output_tokens`, `total_tokens`). Verified present on this host.
- The human emulator runs on Claude by deliberate design (`run.ts` comment: one
  fixed referee keeps campaigns comparable) at model `sonnet`, and inherits the
  agent's reasoning effort through the shared `env` (`effortEnv`).
- Five call sites fall back to `"claude"` when `ide` is absent
  (`pool2_measure.ts` ×3, `cells_import.ts` ×2); `cells_import.ts` also hardcodes
  the emulator model `"sonnet"`.
- CLI help text still says "SWE-bench Verified A/B benchmark" and describes
  `pool2-select` as assembling "3 Sonnet reps + Opus probe" — both retired.

### Constraints

- `scripts/acceptance-tests/` is out of scope and must keep working.
- The benchmark's human emulator imports `cliChatCompletion` from the
  acceptance-test lib. Moving it to codex ADDS a codex chat path there; the
  Claude path stays because the acceptance judge needs it.
- Changing the emulator model changes the cell key (`cell.json.humanEmulator`).
  All six existing cells become incomparable with anything measured afterwards.
  Accepted by the user; must be recorded, not discovered later.
- Web audit does not port one-to-one: the Claude reader audits `WebFetch` /
  `WebSearch` tool calls, while codex reaches the network through `exec` shell
  commands. A codex audit is a different classifier, not a rename.
- Deleting an artifact orphans evidence citing it (AGENTS.md) — the retired
  Claude cell `claude-baseline-none-sonnet-high` is DATA and stays.

## Definition of Done

- [x] FR-BENCH-SWE.IDE: codex is the default and only subject IDE; `--ide claude`
      fails fast with a message naming this retirement instead of running.
  - Test: `scripts/benchmark/run_test.ts` (emulator pinning) + the CLI guard `BENCH_SUBJECT_IDES`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts`
- [x] FR-BENCH-SWE.COST: every codex session writes a non-empty
      `<instance>.metrics.json` harvested from `rollout-*.jsonl`.
  - Test: `scripts/benchmark/metrics_test.ts` (5 rollout tests)
  - Evidence: `deno test -A scripts/benchmark/metrics_test.ts`
- [x] FR-BENCH-SWE.COST + WEBAUDIT live smoke (2026-08-09,
      `agronholm__anyio-1134`, baseline, `--no-grade`): the session wrote
      `metrics.json` — wall 141407 ms, 15 API calls, 339226 in / 3289 out /
      311552 cache-read, **3 tool calls**, 0 parse errors over 2 rollouts — and
      `webaudit.json` (0 accesses, 0 flagged; the session made no network call).
      The 2 rollouts are the agent AND the human emulator, which confirms the
      emulator now runs on codex under the same bench CODEX_HOME. The non-zero
      tool count is the check that mattered: before `eb99272a` it would have
      been 0. Since the session itself touched no URL, extraction was verified
      separately against 192 real historical rollouts — 5 URLs found in shell
      commands, e.g. `https://raw.githubusercontent.com/...`.
  - Evidence: `deno task benchmark pool2-run --arm baseline --pool scripts/benchmark/pools/codex-terra-medium.json --rep 1 --instance agronholm__anyio-1134 --no-grade --out scratch/cost-smoke` then `cat scratch/cost-smoke/rep1/baseline/<id>/<id>.{metrics,webaudit}.json`
- [x] FR-BENCH-SWE.SYMMETRY: the human emulator runs on `gpt-5.6-sol` at a FIXED
      medium effort in both arms, independent of the agent's effort.
  - Test: `scripts/benchmark/run_test.ts::humanEmulatorConfig` + `scripts/acceptance-tests/lib/llm_test.ts` (codex argv pinning)
  - Evidence: `deno test -A scripts/benchmark/run_test.ts scripts/benchmark/human_emulator_test.ts`
- [x] FR-BENCH-SWE.WEBAUDIT: web audit reads codex shell commands
      (`exec_command` field `cmd`, `shell_command` field `command`), deduped by
      `call_id`; `isOracleAdjacent` unchanged. Narrowing recorded, not hidden:
      the codex sandbox has no WebFetch/WebSearch tools, so a search the model
      performs internally leaves no trace.
  - Test: `scripts/benchmark/webaudit_test.ts` (6)
  - Evidence: `deno test -A scripts/benchmark/webaudit_test.ts`
- [x] No `"claude"` fallback remains in the RUN path. The legacy readers
      (`pool2_measure.ts`, `cells_import.ts`) keep theirs on purpose: a recorded
      rep dir with no `ide` field genuinely WAS Claude, so that fallback reads
      history and is not a default for new runs (two tests in
      `pool2_measure_test.ts` encode exactly this and caught the over-broad edit).
  - Evidence: `grep -n '?? "claude"' scripts/benchmark/run.ts | wc -l` returns 0
- [x] SRS + SDS describe a codex-only harness; CLI help text matches.
  - Evidence: `deno task benchmark --help | grep -c 'SWE-bench Verified'` returns 0
- [x] `bench-swe-fix-problems.md` marked `superseded` with the reason.
  - Evidence: `grep -m1 '^status:' documents/tasks/2026/07/bench-swe-fix-problems.md`
- [x] FR-BENCH-SWE.ISOLATION: the agent and the human emulator no longer share a
      codex session store, and the harness reads both.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts` (separate root, credentials only) + `scripts/benchmark/run_test.ts::emulatorEnvFor` + `metrics_test.ts` / `webaudit_test.ts` (two-store harvest)
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts scripts/benchmark/run_test.ts scripts/benchmark/metrics_test.ts scripts/benchmark/webaudit_test.ts`
- [x] FR-BENCH-SWE.ISOLATION live smoke (2026-08-09): a `codex exec` turn under a
      hand-built emulator home — empty `skills/`, only `auth.json` symlinked —
      authenticated, answered, and wrote its rollout into THAT home
      (`sessions/**/*.jsonl`, 1 file). `collectSessionMetrics` then read it back:
      1 API call, 12895 in / 5 out / 9984 cache-read, 0 parse errors. This was
      the risk worth checking before a campaign: if a lone `auth.json` were not
      enough for a separate `CODEX_HOME`, every emulator turn would have died.
  - Evidence: `EMU=$(mktemp -d); mkdir -p "$EMU/.codex/skills"; ln -s ~/.codex/auth.json "$EMU/.codex/auth.json"; echo "Reply with exactly: OK" | env HOME="$EMU" CODEX_HOME="$EMU/.codex" codex exec --model gpt-5.6-sol -c model_reasoning_effort="medium" --ignore-user-config --sandbox read-only --skip-git-repo-check --color never --output-last-message "$EMU/last.txt" -`
- [x] `deno task check` green (660 + 173, 0 failed).
  - Evidence: `deno task check`

## Solution

Answered 2026-08-09 (user 5A): port the audit rather than drop it — the ability
to read the instance's own upstream fix mid-session is the central honesty risk,
and the rollouts carry the command text needed to check it.

Done, in order: codex cost reader (`usageFromRollout`) → subject IDE narrowed to
codex → human emulator to `codex exec` at a pinned medium effort → web audit
ported to shell commands → SRS/SDS/CLI text aligned.

One defect found and fixed after the first commit: tool calls were deduped by
`payload.id`, which 94% of real records do not carry (measured over 1493 rollout
files, 43669 records) — the counter would have reported ~0 tool calls while every
unit test passed, because the fixtures came from the single record shape that has
both fields. Fixed in `eb99272a` with a test on the dominant shape.

### Isolation, and what it does not promise

Added 2026-08-09 on the user's requirement: "у эмулятора и исполнителя не должно
быть возможности прочитать сессии друг друга. А судья должен иметь возможность
читать обе сессии." Both sides now have their own `CODEX_HOME`, neither
environment names the other's, and the harness reads both (the run dir gains an
`emulator-home` symlink next to `bench-home`).

The limit is stated here rather than discovered later: this is separation by
construction of the paths handed out, not an OS-enforced denial. Measured on
codex-cli 0.144.6, a `--sandbox read-only` session read `~/.zshrc` and printed
its first line, so reads are unrestricted in every sandbox mode codex offers and
a session that deliberately scans the temp root can still reach the other store.
Making it hard would need a distinct OS user or a custom seatbelt profile.

### Note for whoever runs the next campaign

A `pool2-run` writes a result cell even under `--no-grade`. The smoke created
`cells/codex-baseline-none-gpt-5-6-terra-medium-t40m-p946da8d8dd51` — a one-row
ungraded record with a new prompt-hash suffix — and it was removed by hand so it
would not enter the data of record. Expect the same after any throwaway run.
