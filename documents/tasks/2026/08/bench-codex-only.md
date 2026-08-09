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
  **Overruled 2026-08-09 by the user:** every cell but the live baseline
  (`codex-baseline-none-gpt-5-6-terra-medium-t40m-p946da8d8dd51-egpt-5-6-sol-medium`)
  was deleted, the Claude one included. The citing lines were annotated in
  `documents/benchmarks/retired-approaches.md` §8 and §9 rather than left
  dangling; every deleted cell's per-rep counts are quoted in prose there and in
  `documents/tasks/2026/07/bench-result-cells.md`, and the rows are recoverable
  from git at commit `a0cc26ae`. The frozen pool is unaffected —
  `loadFrozenPool` reads only the pool JSON.

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
- [x] FR-BENCH-SWE.ISOLATION: one bench codex root at `~/.flowai-dev`,
      credentials symlinked once, a per-run store beneath it shared by the agent
      and the emulator.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts` (root layout, per-run stores, credentials through the root link, idempotent re-prepare) + `scripts/benchmark/run_test.ts::emulatorEnvFor`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts scripts/benchmark/run_test.ts`
- [x] FR-BENCH-SWE.ISOLATION live smoke (2026-08-09): `prepareBenchCodexHome`
      built `~/.flowai-dev/bench/smoke-probe-0001/.codex` with `auth.json ->
      ~/.flowai-dev/auth.json -> ~/.codex/auth.json`; a `codex exec` turn under
      it authenticated through that double link, answered, and wrote 1 rollout
      into the store. `collectSessionMetrics` read it back (1 API call, 14k in,
      0 parse errors) and `collectPeekAudit` reported 0 peeks over 1 transcript.
      This was the risk worth checking before a campaign: if the double symlink
      had not resolved, every session would have died on auth.
  - Evidence: `CH=$(deno eval --no-check "import { prepareBenchCodexHome } from './scripts/acceptance-tests/lib/acp/auth.ts'; console.log(await prepareBenchCodexHome('/tmp/flowai-bench/smoke-probe-0001/sandbox'))"); echo "Reply with exactly: OK" | env CODEX_HOME="$CH" codex exec --model gpt-5.6-sol -c model_reasoning_effort="low" --ignore-user-config --sandbox read-only --skip-git-repo-check --color never --output-last-message /tmp/last.txt -` (probe store removed afterwards)
- [x] FR-BENCH-SWE.ISOLATION: the harness checks whether either side read the
      other's session, since codex offers no read-denying sandbox.
  - Test: `scripts/benchmark/peek_audit_test.ts` (4)
  - Evidence: `deno test -A scripts/benchmark/peek_audit_test.ts`
- [x] FR-BENCH-SWE.ISOLATION: the per-run store is keyed by the FULL sandbox
      path, so two reps of one instance never share it. The first version keyed
      on the instance dir name alone and the rep lives a level above
      `<arm>/<instance>`, so the 2026-08-09 baseline campaign wrote 45 sessions
      into 15 stores and reps 2 and 3 harvested the earlier reps' rollouts as
      their own (`transcriptFiles` 2, 4, 6). Solve verdicts were untouched — they
      come from swebench grading — and the campaign's per-rep cost was recovered
      by filtering rollouts on the rep windows in `cell.json`: rep1 271 API calls
      / 10.3M in / 84k out, rep2 342 / 14.5M / 100k, rep3 308 / 12.6M / 95k, 30
      rollouts each and none outside a window. The committed cell is clean —
      `tasks.jsonl` records no cost — but the run dir's `<instance>.metrics.json`
      files and the console aggregate they add up to (1805 calls / 72.7M in) are
      the double-counted figures and must not be quoted.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts` (rep1 store ≠ rep2 store)
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts`
- [x] The codex-only harness produced a comparable A/B pair at one operating
      point: baseline and flowai over the frozen 15, 3 reps each, same referee
      and same 40-min budget. flowai 13/45 clean against baseline 5/45,
      directional but not significant (p ≈ 0.34 by an instance-paired exact
      binomial), and ×5.6 the API calls. Snapshot with per-instance counts,
      cost, and run integrity: `documents/benchmarks/ab-frozen15-2026-08-09.md`.
  - Evidence: `deno run -A scripts/benchmark.ts cells-show`
- [x] `deno task check` green (665 + 173, 0 failed).
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

### Isolation: separation was tried, then replaced by a check

The requirement arrived as "у эмулятора и исполнителя не должно быть возможности
прочитать сессии друг друга. А судья должен иметь возможность читать обе
сессии." Separate `CODEX_HOME`s were built first and then deliberately dropped,
because measurement said they did not buy the guarantee the wording asks for:
codex-cli 0.144.6 has no sandbox mode that denies disk reads — a `--sandbox
read-only` session read `~/.zshrc` and printed its first line — so separating the
roots removed a pointer and nothing more.

What stands instead, on the user's decision the same day: one bench root at
`~/.flowai-dev` holding the credentials once, a per-run store beneath it shared
by both sides, and `peek_audit.ts` checking afterwards whether either reached for
a session store. The store is per RUN, not one directory for the whole benchmark,
because the cost harvest attributes tokens by walking a store and instances run
four at a time by default — one shared directory would interleave four sessions'
rollouts with no way to separate them.

Nothing purges `~/.flowai-dev`, unlike the temp homes. That is deliberate — the
sessions stay readable after a campaign — and it grows:

    du -sh ~/.flowai-dev/bench/* | sort -h
    find ~/.flowai-dev/bench -maxdepth 1 -mindepth 1 -mtime +14 -exec rm -rf {} +

A `prune-store` / `show-store` pair was written for this and reverted the same
day (`102eba21`, reverted by `66ba4003`) after the user asked what it was for.
The honest answer was nothing the two lines above do not: 388 lines across six
files, whose safety guards — target must resolve under the root, age must not be
negative — protected against failure modes the script itself introduced and
`find` does not have. Recorded so the idea is not re-proposed.

### Note for whoever runs the next campaign

A `pool2-run` writes a result cell even under `--no-grade`. The smoke created
`cells/codex-baseline-none-gpt-5-6-terra-medium-t40m-p946da8d8dd51` — a one-row
ungraded record with a new prompt-hash suffix — and it was removed by hand so it
would not enter the data of record. Expect the same after any throwaway run.
