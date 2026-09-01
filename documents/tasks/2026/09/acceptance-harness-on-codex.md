---
date: 2026-09-01
status: done
implements:
  - FR-ACCEPT
tags: [acceptance-tests, codex, benchmark]
---
# Move the acceptance harness — agent, judge, user emulator — to codex

## Goal

Stop acceptance sweeps from consuming the Claude subscription. Every LLM call the harness makes — the agent under test, the judge, the simulated user — runs on the Codex CLI, like the SWE-bench benchmark already does.

## Overview

### Context

The sweep of 2026-08-31 (`-p 4`, 226 sessions) hit the Claude subscription window at 00:53 UTC on 2026-09-01 after five hours: 250M cache-read and 3.9M output tokens from the bench alone, against 84M / 0.3M from every other session on the account in the same window. The user's expectation was that "we test on codex"; in fact only the SWE-bench benchmark did. The acceptance harness ran the agent on claude-sonnet-4-6 through `claude-agent-acp`, and the judge and user emulator through `claude -p` (`cliChatCompletion`), each judge call re-reading a ~90 KB evidence file.

### Current State

- `acceptance-tests/config.json`: `default_ides: ["claude"]`, judge `claude-sonnet-4-6` for every IDE.
- `scripts/acceptance-tests/lib/llm.ts`: two transports, `cliChatCompletion` (claude) used by `judge.ts` and `user_emulator.ts`, `codexChatCompletion` used only by `scripts/benchmark/human_emulator.ts`.
- `scripts/benchmark/run.ts`: already codex-only for the subject, but `isEmulatorOutage` still matched the Claude wrapper's error text and `codexAgentEnv` lived only in the benchmark.
- `skill_invocation.ts`: keyed on claude-code-acp's `Skill` tool; codex has no such tool.
- 30 scenarios named `.claude` as the sandbox IDE config dir.

### Constraints

- No API keys: both CLIs authenticate through their own login (`~/.codex/auth.json`, symlinked into an empty bench `CODEX_HOME`).
- The judge must never see the maintainer's repo or `~/.codex/skills`: temp cwd, `--ignore-user-config`, isolated `CODEX_HOME`.
- Model and reasoning effort are pinned per call; nothing may inherit `~/.codex/config.toml`.
- The full acceptance sweep is the user's to run; this task verifies one trigger scenario and one judge-graded scenario.

## Definition of Done

- [x] FR-ACCEPT: the judge and the user emulator run on `codex exec` with a JSON output schema; `cliChatCompletion` is gone.
  - Test: `scripts/acceptance-tests/lib/judge_test.ts`, `scripts/acceptance-tests/lib/llm_test.ts::codexExecArgs: attaches an output schema when the caller needs structured JSON`
  - Evidence: `grep -rn cliChatCompletion scripts/ documents/requirements.md documents/design.md | wc -l` prints 0; `deno test -A scripts/acceptance-tests/lib/judge_test.ts scripts/acceptance-tests/lib/llm_test.ts`
- [x] FR-ACCEPT: codex is the default IDE and every judge in `config.json` is a codex model with a pinned effort.
  - Test: `scripts/acceptance-tests/lib/config_test.ts::acceptance-tests/config.json: every arm runs on codex — agent and judge alike`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/config_test.ts`
- [x] FR-ACCEPT: the agent under test gets model and effort pinned through `CODEX_CONFIG`, shared with the benchmark.
  - Test: `scripts/acceptance-tests/lib/agent_env_test.ts`, `scripts/benchmark/run_test.ts::codexAgentEnv: pins effort AND model into the bridge session config`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/agent_env_test.ts scripts/benchmark/run_test.ts`
- [x] FR-ACCEPT: the judge runs from its own `CODEX_HOME` beside the agent's so rollouts do not mix.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::prepareCodexJudgeHome: the judge gets its own CODEX_HOME beside the agent's`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts`
- [x] FR-ACCEPT.TRIGGER: a codex shell read of `skills/<skill>/SKILL.md` counts as invocation; globs and longer names do not.
  - Test: `scripts/acceptance-tests/lib/skill_invocation_test.ts::detectSkillInvocation: codex loads a skill by reading its SKILL.md from the shell`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/skill_invocation_test.ts`; Benchmark: `epic-trigger-pos-1` passed on codex 2026-09-01 (run `2026-09-01T20-21-*`, 1/1)
- [x] FR-BENCH-SWE: the benchmark's emulator-outage detector matches the Codex wrapper's error text.
  - Test: `scripts/benchmark/run_test.ts::isEmulatorOutage: a dead human emulator leaves the instance unmeasured, not missed`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts`
- [x] FR-ACCEPT: scenarios that seed or inspect the sandbox IDE config dir use `.codex`.
  - Evidence: `grep -rln '"\.claude"' framework/*/commands/*/acceptance-tests framework/*/skills/*/acceptance-tests | wc -l` prints 0
- [x] Documentation: SRS FR-ACCEPT / FR-ACCEPT.TRIGGER, SDS §3.4 and the AGENTS.md raw-session/interview instructions describe the codex judge and rollout paths.
  - Evidence: `grep -n "codexChatCompletion" documents/requirements.md documents/design.md`; `grep -n "codex exec resume" AGENTS.md`
- [x] `deno task check` is green.
  - Evidence: `deno task check` — final `N passed | 0 failed` lines

## Solution

1. `llm.ts`: `ModelConfig.effort`, `IdeConfig.agent_effort`; `codexExecArgs` takes an optional `outputSchemaFile` → `--output-schema`; `codexChatCompletion` accepts `jsonSchema` (written to a temp file), defaults effort to `medium` and runs from a fresh temp cwd when none is given; `ChatCompletionFn` replaces `typeof cliChatCompletion`; the Claude transport is deleted.
2. `judge.ts`: pure `buildJudgeRequest` folds the evidence into the system message (codex reads the whole prompt from stdin), demands English reasons and a JSON-only final message; `evaluateChecklist` keeps writing `judge-evidence.md` and retrying once.
3. `user_emulator.ts`, `runner.ts`, `acceptance_runtime.ts`: codex client by default; `agentEffort` flows from config to `agentLaunchEnv` (new `agent_env.ts`, re-exported by `scripts/benchmark/run.ts`); on codex the judge/emulator env is the bench-home plus `prepareCodexJudgeHome` (`<bench-home>/.codex-judge`).
4. `skill_invocation.ts`: `shellReadsSkill` parses `rawInput.command` for an explicit `skills/<name>/SKILL.md`.
5. `config.json`: `default_ides: ["codex"]`, agent `gpt-5.6-terra` at `medium`, judge `gpt-5.6-sol` at `medium` for every IDE.
6. Scenarios: `.claude` → `.codex` in the 11 files that seed or inspect the IDE config dir; `plan/surface-degradation` also degrades `.codex/agents`.
7. Verified on codex: `epic-trigger-pos-1` 1/1 after the detector change (0/1 before — 5 shell calls, no `Skill` tool); `commit-no-checks` judged end-to-end by `gpt-5.6-sol` (107 KB evidence, English reasons, valid JSON) — the agent itself stopped to ask for missing SRS/SDS files instead of committing, which is a product finding for the full sweep, not a harness fault.
8. Left for the user: the full sweep `deno task acceptance-tests` (every cache entry is invalidated by the IDE switch). Token accounting for ACP sessions stays at zero on every IDE (`calculateUsage` returns null for the ACP adapters) — unchanged by this task.
