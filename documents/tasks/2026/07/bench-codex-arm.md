---
date: 2026-07-24
implements:
  - FR-BENCH-SWE.IDE
status: done
---

# Codex arm for the SWE-bench harness (variant B — honest run, cost deferred)

## Goal

Make the FR-BENCH-SWE harness able to drive **Codex** as the agent under test,
so the same-harness A/B (baseline vs flowai) can be measured on a second IDE.
Today every arm is hard-wired to Claude Code; a flowai effect measured on one
IDE alone cannot distinguish "flowai helps" from "flowai helps Claude".

## Overview

### Context

User decision (2026-07-24): variant **B** — build the honest run path (bridge,
isolation, effort pin, pack install) and mark agent-side cost + web audit as
UNAVAILABLE for codex rather than block on porting them. Codex runs under the
user's **ChatGPT subscription** (`~/.codex/auth.json` carries `access_token`),
not an API key.

Evidence gathered before planning (all verified on this host, 2026-07-24):

- `codex-cli 0.144.6` has **no `acp` subcommand**. `codex acp` falls through to
  the interactive TUI treating `acp` as a prompt (`Error: stdin is not a
  terminal`). The registry row `codex: { args: ["acp"] }` is therefore dead —
  the codex path was never exercised.
- The ACP bridge exists as a separate package: **`@agentclientprotocol/codex-acp`
  v1.1.7** (bin `codex-acp`), same family as `claude-code-acp`. Its README
  advertises ChatGPT-login auth, model + reasoning-effort configuration,
  permission/approval events, and token-usage events.
- Bridge runtime knobs: `CODEX_CONFIG` (JSON merged into the Codex session
  config), `INITIAL_AGENT_MODE` (`read-only` | `agent` | `agent-full-access`),
  `CODEX_PATH`, `NO_BROWSER`.
- `CODEX_HOME` selects the Codex config dir (isolation lever).
- **Isolation is required, not optional**: `~/.codex/skills/` holds 12
  user-level skills on this host (same shadowing class as FR-ACCEPT-ISOLATION),
  and `~/.codex/config.toml` globally sets `model_reasoning_effort = "ultra"`
  plus `model = "gpt-5.6-sol"` — exactly the operator-shell leak that
  `effortEnv` exists to prevent (FR-BENCH-SWE.SYMMETRY effort invariant).
- Codex token accounting IS recoverable later: `~/.codex/sessions/<Y>/<M>/<D>/
  rollout-*.jsonl` carries `total_token_usage` with `input_tokens`,
  `output_tokens`, `cached_input_tokens`. Deferred by variant B, not lost.
- Pack install needs no new build: `scripts/build-plugins.ts` already emits
  `.codex-plugin/plugin.json` per plugin with `"skills": "./skills/"`, and
  `copyFrameworkToIdeDir(src, dir, ideName)` already takes the IDE name.
  Codex discovers skills at `<repo>/.codex/skills/<name>/SKILL.md`.

### Current State

- `scripts/acceptance-tests/lib/acp/registry.ts` — `ACP_AGENTS.codex` points at
  the non-existent `codex acp`; `authMode` is a dead descriptive field read
  nowhere.
- `scripts/acceptance-tests/lib/acp/auth.ts` — `prepareAcpClaudeHome` is the
  only isolation builder; wired for `ide === "claude"` in `adapters/mod.ts`.
- `scripts/benchmark/run.ts` — three hard `"claude"`: `createAdapter("claude")`
  (238), `new AcpAgent({ ide: "claude" })` (267), `copyFrameworkToIdeDir(...,
  ".claude", "claude", ...)` (219–224). `effortEnv(effort)` emits only
  `CLAUDE_EFFORT` + `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`. Model reaches the
  agent as `ANTHROPIC_MODEL` inside `AcpAgent` — Claude-only.
- `scripts/benchmark/metrics.ts` / `webaudit.ts` — read
  `<benchHome>/.claude/projects/**/*.jsonl`; both throw when absent and are
  caught+logged loudly by `runArm`.
- `scripts/benchmark.ts` — no `--ide` option at all; `--model` defaults to
  `sonnet`.
- The judge (`gate.ts` → `llm.ts` `cliChatCompletion`) shells out to `claude -p`.

### Constraints

- **Judge stays on Claude** in both IDEs — it is the referee, not the subject;
  one referee keeps campaigns comparable. It therefore still needs the Claude
  bench-home (`HOME`) even when the agent is codex, or the developer's personal
  `~/.claude/CLAUDE.md` leaks into judge replies.
- **No silent fallbacks.** A codex run with a Claude model id (or vice versa)
  must fail fast, not guess.
- **Never report a misleading cost number.** For the codex arm the only Claude
  transcripts in bench-home are the JUDGE's; harvesting them would render a
  plausible-looking "session cost" that measures the referee, not the agent.
  Skip explicitly and label it.
- Effort must be pinned identically across arms of one campaign (existing
  FR-BENCH-SWE.SYMMETRY invariant), now per IDE.
- Deno Code TDD (RED → GREEN → REFACTOR → CHECK). `deno task check` green.
- Pool provenance: `pool2.json` was selected by a **Sonnet** keep-rule. A codex
  campaign over it is a mechanism finder for codex, not a recalibrated pool —
  every codex report must say so.

## Definition of Done

- [x] FR-BENCH-SWE.IDE: the codex ACP row launches the real bridge, not a dead
      subcommand
  - Test: `scripts/acceptance-tests/lib/acp/registry_test.ts::codex reaches ACP
    through the bridge, never a codex subcommand`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/registry_test.ts`
    → 3 passed
- [x] FR-BENCH-SWE.IDE: codex sessions run under an isolated `CODEX_HOME` that
      shadows no user-level skill and still authenticates by subscription
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::codex bench-home
    isolates user skills AND user config` (+ `auth.json` link, judge `HOME`)
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts`
    → 6 passed; live run's `CODEX_HOME/skills` held ONLY codex's bundled
    `.system` skills, none of the host's 12 user skills, and no `config.toml`
- [x] FR-BENCH-SWE.IDE: reasoning effort and model are pinned per IDE, so the
      developer's `~/.codex/config.toml` cannot set them
  - Test: `scripts/benchmark/run_test.ts::codexAgentEnv: pins effort AND model
    into the bridge session config`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts` → 5 passed; the live
    session's rollout records `"reasoning_effort":"high"` while the host config
    sets `ultra` — the override demonstrably wins
- [x] FR-BENCH-SWE.IDE: `--ide` reaches the adapter, the ACP agent and the pack
      installer; a model/IDE mismatch fails fast
  - Test: `scripts/benchmark/run_test.ts::assertModelForIde: a cross-IDE model is
    refused, not silently run`
  - Evidence: `deno run -A scripts/benchmark.ts run --arm baseline --ide codex
    --model sonnet --limit 1` exits 1 with the named mismatch; unknown `--ide`
    also exits 1; the live flowai probe installed 18 skills into `.codex/skills`
- [x] FR-BENCH-SWE.IDE: the codex bridge sustains a MULTI-TURN session — the
      flowai arm needs three operator turns and the baseline instance happened
      to finish in one, so this was never exercised by it
  - Test: live probe (two turns on one ACP session)
  - Evidence: probe reported `turns observed: 2` with both turn-1 (`a.txt`) and
    turn-2 (`b.txt`) artifacts written
- [x] FR-BENCH-SWE.IDE: the flowai arm invokes skills with the IDE's own prefix
      — codex rejects `/plan <args>`, so a slash turn would silently degrade the
      arm to a bare session
  - Test: `scripts/benchmark/operator_test.ts::commandPrefixFor` and
    `::planTurn/reviewTurn: carry the IDE's prefix, args unchanged`
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts`; live probe —
    `$plan` fires the installed skill on codex
- [x] FR-BENCH-SWE.IDE: cost + web audit are explicitly UNAVAILABLE for non-
      Claude IDEs — never a judge-only number passed off as session cost
  - Test: covered at the driver level, not by a unit test — the skip is a branch
    in `runArm` around the two harvest calls
  - Evidence: the live codex instance printed `cost: unavailable (codex — Claude
    transcripts describe the judge, not the agent)` + the same for `web:`, and
    wrote no `*.metrics.json`
  - **Deferred (stated, not hidden):** `report.ts` still renders the cost
    section only when metrics files exist, so a codex report OMITS the section
    silently instead of printing "unavailable". Closing that needs the run's IDE
    plumbed into the report; until then the campaign report must state it in
    prose.
- [x] FR-BENCH-SWE.IDE: a real codex session drives one pool2 instance end to
      end and produces a non-empty patch
  - Test: live smoke (single instance, cheapest in `pool2.json`)
  - Evidence: `deno run -A scripts/benchmark.ts pool2-run --rep 1 --ide codex
    --model gpt-5.6-sol --instance agronholm__anyio-1121 --no-grade` → exit 0,
    `rep1/baseline.jsonl` carries a 3131-byte / 84-line patch touching
    `src/anyio/_backends/_asyncio.py`
- [x] FR-BENCH-SWE.IDE: SRS + SDS describe the codex arm, its deferred cost
      capture, and the Sonnet-calibrated pool caveat
  - Test: n/a (docs)
  - Evidence: `deno task check` green (610 + 173 tests); `grep -n
    "FR-BENCH-SWE.IDE" documents/requirements.md documents/design.md`
- [x] FR-BENCH-SWE.IDE: the codex FLOWAI arm completes its plan turn end to end
      (task file produced) within the real 20-minute session budget
  - Test: live probe of turn 1 with the pack + `AGENTS.md` + doc stubs installed
  - Evidence: exit 0 with `documents/tasks/2026/07/add-verbose-output.md`
    written — the planner's signature artefact, at the correct nested path. The
    transcript shows FULL skill fidelity on codex: it spawned the `surface_scout`
    subagent, then re-read the file and checked its own frontmatter and sections
    (`date`/`status`/`implements`/Goal/Overview/DoD/Solution) with `rg`.
  - Note: an earlier attempt at a 7-minute probe budget timed out — that was a
    probe artefact, not a codex limit; the real harness allows 20 minutes.

## Solution

Ordered so the riskiest unknown (does the bridge drive a full session at all?)
is proven before the peripheral work.

1. **Registry row.** Replace `codex acp` with `npx -y
   @agentclientprotocol/codex-acp@1.1.7`; fix the stale `authMode` to
   `subscription`. Version pinned so the ACP cache key invalidates on upgrade.
2. **`prepareAcpCodexHome`.** Reuse `prepareAcpClaudeHome` for the shared
   bench-home (the judge needs it), then add `<benchHome>/.codex/` with an empty
   `skills/` and a symlink to the real `~/.codex/auth.json`; return
   `{ HOME, CODEX_HOME }`. Wire it into `createAdapter` for `ide === "codex"`.
3. **Per-IDE agent env.** Generalize `effortEnv(effort)` →
   `effortEnv(ide, effort, model)`: claude keeps its two keys; codex emits
   `CODEX_CONFIG={"model_reasoning_effort":<effort>,"model":<model>}` plus
   `INITIAL_AGENT_MODE=agent-full-access` (without it the bridge may start
   read-only and silently yield empty patches). The judge keeps the Claude
   effort keys regardless of the agent IDE.
4. **`--ide` threading.** Add `ide` to `RunOptions`; `run.ts` takes the config
   dir from the registry spec instead of the literal `.claude`; `benchmark.ts`
   gains `--ide` (default `claude`) and fails fast on model/IDE mismatch.
5. **Smoke run** on the cheapest pool2 instance — proves bridge + auth +
   permissions + patch capture before more code is written.
6. **Cost / web audit skip.** In `runArm`, harvest only when the agent IDE is
   claude; otherwise log `cost: unavailable (codex — transcripts not harvested)`
   and let `report` render the same wording. No fabricated numbers.
7. **Docs.** New `#### FR-BENCH-SWE.IDE` in SRS (with the Sonnet-pool caveat and
   the deferred cost capture stated as a known limitation) + SDS §3.22 update.
