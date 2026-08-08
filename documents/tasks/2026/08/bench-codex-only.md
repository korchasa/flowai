---
date: 2026-08-09
status: in progress
implements:
  - FR-BENCH-SWE.IDE
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
- [ ] FR-BENCH-SWE.COST live smoke: one real
      `pool2-run --arm baseline --rep 1 --instance <id>` writes a non-empty
      metrics.json.
  - Evidence: `deno task benchmark pool2-run --arm baseline --pool scripts/benchmark/pools/codex-terra-medium.json --rep 1 --instance <id>` then `cat <repDir>/baseline/<id>/<id>.metrics.json`
- [x] FR-BENCH-SWE.SYMMETRY: the human emulator runs on `gpt-5.6-sol` at a FIXED
      medium effort in both arms, independent of the agent's effort.
  - Test: `scripts/benchmark/run_test.ts::humanEmulatorConfig` + `scripts/acceptance-tests/lib/llm_test.ts` (codex argv pinning)
  - Evidence: `deno test -A scripts/benchmark/run_test.ts scripts/benchmark/human_emulator_test.ts`
- [ ] FR-BENCH-SWE.WEBAUDIT: web audit reads codex `exec` commands, or the FR is
      explicitly re-scoped to "not measured on codex" with the reason recorded.
  - Test: `scripts/benchmark/webaudit_test.ts`
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
- [ ] `deno task check` green.
  - Evidence: `deno task check`

## Solution

Filled after the open question below is answered.

### Open question

Web audit on codex has no one-to-one port. Either build an `exec`-command
classifier (curl / wget / pip / git fetch / …) or re-scope the FR and say plainly
that network access is not audited on codex. Decide before touching
`webaudit.ts`.
