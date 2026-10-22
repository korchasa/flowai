---
date: 2026-10-21
status: done
implements:
  - FR-BENCH-SWE.IDE
  - FR-BENCH-SWE.SYMMETRY
  - FR-BENCH-SWE.COST
  - FR-BENCH-SWE.WEBAUDIT
  - FR-BENCH-SWE.ISOLATION
  - FR-ACCEPT.TOKEN-USAGE
related_tasks:
  - documents/tasks/2026/08/bench-codex-only.md
  - documents/tasks/2026/10/claude-judge-over-acp.md
---

# SWE-rebench benchmark on claude-sonnet-5-5 by default, codex kept

## Goal

The benchmark measures flowai on the same agent the acceptance tests run on by
default since 2026-10-17 — Claude Code with `claude-sonnet-5-5` — so a benchmark
result and an acceptance verdict describe the same product on the same model.
Codex stays available as a second subject IDE, so the codex campaigns already
recorded can be repeated.

## Overview

### Context

User decisions (2026-10-21), asked as two questions:

- "переключи на sonnet-5.5, по аналогии с приемочными тестами" — the agent runs
  `claude-sonnet-5-5` at medium effort, and the human emulator moves to
  `claude-sonnet-5-5` too, the way the acceptance judge and user emulator did
  (`claude-judge-over-acp.md`). The emulator keeps its own fixed `medium`
  effort (FR-BENCH-SWE.SYMMETRY).
- Codex: "both IDEs through the shared acceptance-test interface" — claude is
  the default subject, codex stays selectable. Claude agent token usage is
  read by ONE reader in the acceptance lib, used by the acceptance adapter
  (where the claude arm prints "not measured" today) and by the benchmark.
  This reverses the 2026-08-09 "codex only, one implementation" decision for
  the subject IDE; the per-IDE web and peek audits live in the benchmark.
- Pool: keep the frozen 15 (`scripts/benchmark/pools/codex-terra-medium.json`)
  and decide after the Sonnet baseline. Re-select trigger, fixed BEFORE the
  run: if the Sonnet baseline resolves more than 7 of the 15 instances in EACH
  of its 3 reps, the pool is re-selected for Sonnet by the keep-rule.

### Current State

- `scripts/benchmark.ts`: `BENCH_SUBJECT_IDES = ["codex"]`, `--ide` default
  `codex`, `--model` default `gpt-5.6-terra`, `--human-emulator-model` default
  `gpt-5.6-sol`; `--ide claude` fails with a "retired 2026-08-09" message; the
  run ends with `closeCodexSessions()`.
- `scripts/benchmark/run.ts` `runArm` already drives the agent through
  `AcpAgent` + `createAdapter(ide)`, but: always prepares the codex store
  (`prepareBenchCodexHome`), pins only codex env (`codexAgentEnv`), builds a
  codex-only emulator env (`emulatorEnvFor`), harvests cost / web / peek from
  codex rollouts only, and `isEmulatorOutage` matches only `Codex CLI failed`.
- `human_emulator.ts` calls `codexChatCompletion` directly. The acceptance lib
  already has a dispatcher `chatCompletion` (`judge_transport.ts`) that sends
  `claude*` models over the claude ACP bridge; its bridges are pooled per
  `[model, effort, cwd, env]` and closed only all at once.
- `metrics.ts`, `webaudit.ts`, `peek_audit.ts` parse codex rollouts only. The
  retired Claude readers are in git at `8afba3d0^` (`usageFromTranscript`,
  `accessesFromTranscript`).
- Acceptance adapter (`scripts/acceptance-tests/lib/adapters/mod.ts`):
  `calculateUsage` is codex-only; claude returns null.
- flowai arm writes only `AGENTS.md`. Claude Code auto-loads `CLAUDE.md`, not
  `AGENTS.md`; the acceptance runner writes a real root `CLAUDE.md` for the
  claude arm for exactly this reason (`runner.ts`, 2026-08-13). Without it the
  process rules never reach a claude flowai session.
- Claude transcript shape, verified 2026-10-21 on this host's own Claude Code
  sessions: one API response spans several `assistant` lines sharing
  `message.id`; usage keys `input_tokens`, `cache_read_input_tokens`,
  `cache_creation_input_tokens`, `output_tokens`,
  `output_tokens_details.thinking_tokens`; subagent transcripts sit at
  `<projects>/<slug>/<session>/subagents/agent-*.jsonl` and share no
  `message.id` with the main transcript (5 vs 288 ids, overlap 0).

### Constraints

- Codex behaviour stays byte-identical: same env, same store, same prompts, so
  the existing codex cells stay reproducible.
- The emulator identity, IDE and model are in the cell key — the Sonnet
  campaign lands in new cells by construction; no old cell is touched.
- Harvest failures stay loud and never fail the instance (COST/WEBAUDIT rule).
- No silent fallback from claude to codex anywhere.
- Claude auth goes through the Keychain links of the adapter's temp bench-home;
  changing the claude config root would change the Keychain service name, so
  the bench-home stays where the adapter builds it.

## Definition of Done

- [x] FR-ACCEPT.TOKEN-USAGE: a Claude Code transcript converts to a `TokenBreakdown` — one count per `message.id` (last line wins), thinking split out of output, subagent files summed, null when no projects dir
  - Test: `scripts/acceptance-tests/lib/acp/claude_usage_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/claude_usage_test.ts`
- [x] FR-ACCEPT.TOKEN-USAGE: the claude acceptance adapter's `calculateUsage` reads the run's `HOME` transcripts instead of returning null
  - Test: `scripts/acceptance-tests/lib/adapters/mod_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/adapters/mod_test.ts`
- [x] FR-BENCH-SWE.COST: the benchmark harvests cost from claude transcripts under the bench-home (API calls = unique message ids, tool calls = unique `tool_use` ids, tokens via the shared reader) and from codex rollouts as before
  - Test: `scripts/benchmark/metrics_test.ts`
  - Evidence: `deno test -A scripts/benchmark/metrics_test.ts`
- [x] FR-BENCH-SWE.WEBAUDIT: claude transcripts yield `WebFetch` URLs, `WebSearch` queries and URLs inside `Bash` commands, deduped by `tool_use` id; codex unchanged
  - Test: `scripts/benchmark/webaudit_test.ts`
  - Evidence: `deno test -A scripts/benchmark/webaudit_test.ts`
- [x] FR-BENCH-SWE.ISOLATION: the peek audit reads claude `Bash` commands and `Read`/`Grep`/`Glob` paths and flags claude session-store markers; codex unchanged; claude transcripts are copied to `~/.flowai-dev/bench/<runKey>/claude-projects` after the session
  - Test: `scripts/benchmark/peek_audit_test.ts`, `scripts/benchmark/run_test.ts`
  - Evidence: `deno test -A scripts/benchmark/peek_audit_test.ts scripts/benchmark/run_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the human emulator defaults to `claude-sonnet-5-5` at fixed medium, goes through the model-routed transport, gets an env whitelist per transport (claude: `HOME`; codex: `HOME` + `CODEX_HOME`), its bridge is closed after the instance, and a dead claude bridge counts as an emulator outage
  - Test: `scripts/benchmark/run_test.ts`, `scripts/benchmark/human_emulator_test.ts`, `scripts/acceptance-tests/lib/judge_transport_test.ts`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts scripts/benchmark/human_emulator_test.ts scripts/acceptance-tests/lib/judge_transport_test.ts`
- [x] FR-BENCH-SWE.IDE: `claude` is the default subject IDE with `claude-sonnet-5-5`, `codex` still accepted; a claude session gets `claudeAgentEnv` + `effortEnv` and no codex store; the flowai arm writes a real root `CLAUDE.md` on claude and the diff capture excludes it
  - Test: `scripts/benchmark/run_test.ts`, `scripts/benchmark/predictions_test.ts`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts scripts/benchmark/predictions_test.ts` and `deno run -A scripts/benchmark.ts pool2-run --help | grep -F 'claude-sonnet-5-5'`
- [x] FR-BENCH-SWE.IDE live smoke: one baseline and one flowai session on claude over the frozen pool write a non-empty `metrics.json`, `webaudit.json`, `peekaudit.json`, and the flowai log shows the `plan` skill firing
  - Evidence: `deno task benchmark pool2-run --arm baseline --pool scripts/benchmark/pools/codex-terra-medium.json --rep 1 --instance agronholm__anyio-1134 --no-grade --out <scratch>/claude-smoke` (same with `--arm flowai` and its own `--out`: a campaign dir refuses a second arm), then `cat <scratch>/claude-smoke/rep1/<arm>/<id>/<id>.{metrics,webaudit,peekaudit}.json`
- [x] SRS (FR-BENCH-SWE and sub-FRs above, FR-ACCEPT.TOKEN-USAGE) and SDS describe claude as the default subject with codex kept, the claude emulator, the per-IDE readers and the pool re-select trigger
  - Evidence: `grep -n 'claude-sonnet-5-5' documents/requirements.md documents/design.md` names the benchmark sections
- [x] `deno task check` passes
  - Evidence: `deno task check > <scratch>/check.log 2>&1; echo EXIT: $?` → `EXIT: 0`

## Solution

1. **Shared claude usage reader** (acceptance lib, TDD): new
   `scripts/acceptance-tests/lib/acp/claude_usage.ts` with
   `parseClaudeTranscript(text)` → `{ tokens: TokenBreakdown | null,
   apiCalls, toolCalls, parseErrors }` (dedupe usage by `message.id`, last
   wins; tool calls by `tool_use` id; `freshInput = input_tokens`,
   `cachedInput = cache_read`, `cacheWrite = cache_creation`,
   `reasoning = thinking_tokens`, `output = output_tokens − thinking`,
   `total` = sum) and `collectClaudeUsage(home)` walking
   `<home>/.claude/projects/**.jsonl`. Wire it into `createAdapter` for claude
   (`env.HOME`).
2. **Benchmark readers per IDE**: introduce `SessionStore = { ide: "codex";
   codexHomes } | { ide: "claude"; homes }` in `session_store.ts`. `collectSessionMetrics`,
   `collectWebAudit`, `collectPeekAudit` take it. Claude branches:
   metrics from `parseClaudeTranscript`; web audit from `WebFetch.url`,
   `WebSearch.query`, `Bash.command` URLs; peek audit over `Bash.command` and
   `Read.file_path`, `Grep.path`, `Glob.path`/`pattern` with markers
   `.claude/projects`, `bench-home`, `CLAUDE_CONFIG_DIR`, `flowai-operator-`,
   `answer-emulator-`. Codex code paths unchanged.
3. **Emulator**: `makeCli*Emulator` call `chatCompletion` (model-routed);
   `emulatorEnvFor(model, home)` whitelists per transport; the emulator cwd
   is created by `runArm` and the claude bridge for that config is closed
   after the instance (`closeClaudeBridge(config)` exported from
   `judge_transport.ts`); `humanEmulatorConfig` default `claude-sonnet-5-5`;
   `isEmulatorOutage` also matches `claude judge bridge (failed|stopped|
   returned an empty reply)`. `benchmark.ts` closes both transports at exit
   (`closeJudgeSessions`).
4. **runArm per IDE**: codex — unchanged; claude — no codex store, env
   `effortEnv + claudeAgentEnv(effort)`, store `{ ide: "claude", homes:
   [benchHome] }`, transcripts copied to
   `~/.flowai-dev/bench/<runKey>/claude-projects` after harvest. flowai arm on
   claude also writes a root `CLAUDE.md` with the `AGENTS.md` content;
   `CLAUDE.md` joins `DIFF_EXCLUDES`.
5. **CLI**: `BENCH_SUBJECT_IDES = ["claude", "codex"]`, defaults
   `--ide claude`, `--model claude-sonnet-5-5`, `--human-emulator-model
   claude-sonnet-5-5`; help text and the FR-BENCH-SWE title stop saying
   "codex only".
6. **Docs**: SRS FR-BENCH-SWE, .IDE, .SYMMETRY, .COST, .WEBAUDIT, .ISOLATION,
   FR-ACCEPT.TOKEN-USAGE; SDS §3.22; pool caveat + re-select trigger.
7. **Verify**: unit tests per step, `deno task check`, live smoke of one
   baseline and one flowai session with `--no-grade`. The Sonnet campaign
   itself (2 arms × 3 reps × 15 instances) is the maintainer's run.

## Results

Live smoke 2026-10-21, `agronholm__anyio-1134`, Claude Code `claude-sonnet-5-5`@medium, emulator `claude-sonnet-5-5`@medium, `--no-grade`:

- baseline: exit 0, 3300-byte patch, 0.7 min, 9 API calls, 292k input tokens (251k cache read, 40k cache write), 7 tool calls; 2 transcripts (agent + answer emulator); web audit 1 access, flagged as own-repo (`github.com/agronholm/anyio/issues/1134`); peek audit 0.
- flowai: exit 0, 5188-byte patch, 12.2 min, 41 API calls, 3.6M input tokens (3.4M cache read), 46 tool calls; 5 transcripts (agent, 2 subagents, operator emulator); turns `/plan` → emulator authorized one variant → `/implement` → `/review`; web audit 0; peek audit 1 — a false positive: the plan skill's subagent survey lists `${CODEX_HOME:-$HOME/.codex}/agents/`, which matches the `CODEX_HOME` marker without reading any session.
- Transcripts preserved under `~/.flowai-dev/bench/<runKey>/claude-projects` for both runs.

Sonnet campaign 2026-10-21 (3 reps per arm, frozen pool `codex-terra-medium.json`, cells `claude-baseline-none-claude-sonnet-5-5-medium-…` and `claude-flowai-568cb28dbe61-claude-sonnet-5-5-medium-…`):

- Resolved per rep: baseline 5, 5, 7; flowai 7, 6, 4. Totals 17/45 each.
- Pool re-select trigger (more than 7 of 15 in each baseline rep) NOT met: the pool stays.
- Per instance (baseline / flowai, of 3): `pygeoapi-2338` 3/1, `mempalace-1004` 1/3, `hermes-webui-1818` 0/1, `pdm-3759` 1/1, `pennylane-9298` 0/1, `schemathesis-3778` 3/3, `schemathesis-3933` 3/1, `sqlglot-7457` 3/3, `virtualizarr-979` 3/3; the other 6 unsolved by both.
- Paired by rep: 5 flowai-only solves, 5 baseline-only; two-sided sign test p = 1.0.
- Cost per session (mean): baseline 2.2 min, 0.63M input, 5k output, 12 tool calls; flowai 23.2 min, 6.75M input, 70k output, 76 tool calls.
- Budget hits (exit 124): flowai 10/45 — `schemathesis-3933` 3, `nicegui-5914` 3, `schemathesis-3778` 2, `pennylane-9298` 2; baseline 0. Two of them still produced a resolving patch. The two inspected schemathesis sessions spent ~26 of 40 min in tool calls, mostly full test-suite runs of 4–10 min (the review step also re-runs the suite on the parent revision), and both compacted context mid-implement.
