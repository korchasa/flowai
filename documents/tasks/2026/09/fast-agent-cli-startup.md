---
date: 2026-09-15
status: done
implements:
  - FR-ACCEPT.BRIDGE-LOCAL
  - FR-ACCEPT.JUDGE-APPSERVER
tags:
  - performance
  - acceptance-tests
  - benchmark
---

# Cut fixed startup cost out of every agent and judge session

## Goal

A full acceptance sweep is 369 scenarios and 11.2 hours of wall-clock. Every
scenario pays a fixed startup cost before the model is asked anything, and every
judge call pays a second one. Removing that cost shortens every sweep, every
benchmark campaign and every single-scenario TDD iteration, without touching what
is measured.

## Overview

### Context

Measured on this host 2026-09-15, prompted by the second-brain note
`~/www/4ra/opsbrain/knowledge/AI/tools/local-agent-cli-startup-latency.md`
("Local Agent CLI Startup Latency"). That note establishes two facts this task
applies: a codex session can be opened before the prompt exists, so its warmup
leaves the critical path; and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
removes most of Claude's non-model startup cost.

Measurement in OUR harness (spawn to session ready, 3 runs each):

- codex bridge as shipped: 7.9 / 8.0 / 10.8 s
- codex bridge, npm cache shared: 1.7 / 1.7 / 2.4 s
- codex bridge, launched directly from an installed copy: 0.76 / 0.87 / 0.95 s
- claude bridge as shipped: 9.3 / 10.1 / 13.2 s
- claude bridge, installed copy + `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`:
  0.36 / 1.23 s

Judge and user emulator, re-measured 2026-09-15 under the judge's own isolation
(an empty `CODEX_HOME`), prompt to answer, 5 calls each:

- `codex exec`: 5.69 / 5.25 / 4.50 / 4.15 / 5.71 s
- `codex app-server` after a 0.58 s prewarm: 4.95 / 2.62 / 2.82 / 2.29 / 3.32 s

Read that shape carefully. The first turn in a fresh app-server child still pays
a one-off warmup and lands where `exec` does; only the turns after it halve. The
saving is per app-server CHILD, not per thread, and today the child is keyed by
the judge's per-scenario `CODEX_HOME`. An earlier probe that showed a 2.2 s
`thread/start` was confounded: it ran under the developer's own `~/.codex` and
loaded 10 MCP servers on every thread.

The dominant cost is ours, not the CLIs': `AcpAgent` launches each bridge with
`npx -y <pkg>@<version>`, and FR-ACCEPT-ISOLATION points `HOME` at a fresh
bench-home per scenario. npm's cache lives under `HOME`, so every scenario
re-downloads the whole dependency tree — 456 MB. Side effect on disk:
`acceptance-tests/runs` holds 657 `bench-home/.npm` trees and occupies 154 GB.

### Current State

- `scripts/acceptance-tests/lib/acp/registry.ts` — `ACP_AGENTS[ide].launch` is
  `{ command: "npx", args: ["-y", "<pkg>@<version>"] }` for claude and codex.
- `scripts/acceptance-tests/lib/acp/acp_agent.ts` — spawns that launch spec under
  `setpgrp_exec.py`, then `initialize` → `session/new` → `session/prompt`.
- `scripts/acceptance-tests/lib/acp/auth.ts` — builds the isolated bench-home;
  already sets `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`, not the traffic flag.
- `scripts/acceptance-tests/lib/llm.ts` — `codexChatCompletion` is the single LLM
  transport for the acceptance judge, the acceptance user emulator and the
  benchmark human emulator. It spawns `codex exec` per call and waits for process
  exit before reading `--output-last-message`.
- `scripts/benchmark/run.ts` reuses `AcpAgent` and `codexAgentEnv`, so both
  systems inherit whatever the ACP layer does.

### Constraints

- Isolation invariants stay intact: FR-ACCEPT-ISOLATION (bench-home, empty
  `skills/`), FR-BENCH-SWE.IDE (empty `CODEX_HOME`, auth only, no `config.toml`),
  FR-ACCEPT-GUARDS (setpgrp process group + watchdog).
- Bridge versions stay pinned and stay folded into the cache key
  (FR-ACCEPT-CACHE), so an upgrade still invalidates stale verdicts.
- No npx fallback (user decision 2026-09-15): a missing or wrong-version bridge
  fails fast with the install command, it does not silently take a slow path.
- The judge keeps a validated JSON verdict object and a read-only sandbox —
  today's `--output-schema` and `--sandbox read-only`.
- Deno only, no new third-party dependency for the app-server client.

## Definition of Done

- [x] FR-ACCEPT.BRIDGE-LOCAL: the ACP bridges are installed once into a
      repo-local, gitignored store and launched directly; no scenario spawns
      `npx`, and a missing or version-mismatched store fails fast with the exact
      install command.
  - Test: `scripts/acceptance-tests/lib/acp/bridge_store_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/bridge_store_test.ts scripts/acceptance-tests/lib/acp/registry_test.ts` — ran 2026-09-15, `0 failed`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/bridge_store_test.ts --filter 'no registry launch shells out to npx'` — ran 2026-09-15, `1 passed | 0 failed`
  - Evidence: during the live smoke below, `ps` showed the bridge running as
    `.acp-bridges/agentclientprotocol__codex-acp@1.1.7/node_modules/.bin/codex-acp`,
    and spawn-to-session-ready fell from 7.9-13.2 s to ~0.5 s
- [x] FR-ACCEPT.BRIDGE-LOCAL: the claude bridge launches with
      `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::prepareAcpClaudeHome disables nonessential Claude traffic`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts` — ran 2026-09-15, `0 failed`; measured effect on `session/new`: ~0.76 s → ~0.36 s
- [x] FR-ACCEPT.JUDGE-APPSERVER: the judge, the acceptance user emulator and the
      benchmark human emulator run over `codex app-server --stdio`; the thread is
      opened before the prompt text exists and reused for the call.
  - Test: `scripts/acceptance-tests/lib/appserver_client_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/appserver_client_test.ts scripts/acceptance-tests/lib/llm_test.ts` — ran 2026-09-15, `0 failed`
- [x] FR-ACCEPT.JUDGE-APPSERVER: the app-server transport keeps the judge's
      guarantees — validated JSON against the checklist schema, read-only sandbox,
      pinned model and effort, isolated `CODEX_HOME`, empty reply is an error.
  - Test: `scripts/acceptance-tests/lib/llm_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/llm_test.ts` — ran 2026-09-15, `7 passed | 0 failed`
- [x] Both systems stay green end to end on a real scenario.
  - Evidence: `deno task acceptance-tests -f draw-mermaid-diagrams --no-cache` — ran
    2026-09-15, all 5 scenarios PASSED, 0 errors, 0 warnings, 414.4 s total
    (`acceptance-tests/runs/2026-09-15T14-18-56/report.html`)
  - Evidence: `deno task check` — ran 2026-09-15, exit 0, `818 passed | 0 failed`
    and `187 passed | 0 failed`
- [x] FR-ACCEPT.JUDGE-APPSERVER: the judge's `CODEX_HOME` is one per RUN, so a
      sweep spawns one app-server child instead of one per scenario (user
      decision 2026-09-15, taken after the A/B showed the gain is per child).
  - Test: `scripts/acceptance-tests/lib/runner_test.ts::the judge env is the run home and nothing else`
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::runCodexJudgeHome: every scenario of a run gets the same home`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_test.ts scripts/acceptance-tests/lib/acp/auth_test.ts` — ran 2026-09-15, `0 failed`
  - Evidence: `deno task acceptance-tests -f draw-mermaid-diagrams --no-cache` — run 2026-09-15T14-34-54, all 5 scenarios PASSED, 0 errors, 0 warnings, 156.4 s total (414.4 s on the per-scenario judge home).
    A `ps` sampler at 2 s over the whole run recorded exactly one judge child: PIDs 52275/52278, the node
    launcher `/opt/homebrew/bin/codex` and the vendored binary it execs, both alive for 87 samples (~174 s).
    The five short-lived PIDs beside them (52281, 53170, 53875, 54678, 55715) are the per-scenario AGENT
    bridges, which are one per sandbox by design and unchanged; the pair shape was confirmed by launching
    one `codex app-server --stdio` by hand and seeing the same parent/child pair.
- [x] SRS and SDS carry both clauses and the measured numbers.
  - Evidence: `grep -n 'FR-ACCEPT.BRIDGE-LOCAL\|FR-ACCEPT.JUDGE-APPSERVER' documents/requirements.md documents/design.md`
    — 4 hits: SRS lines 769 and 777, SDS sections 3.4.4 and 3.4.5

## Solution

1. **Bridge store** (`scripts/acceptance-tests/lib/acp/bridge_store.ts`, new).
   `npm install --no-save --prefix <store>` of the pinned spec into
   `.acp-bridges/<pkg>@<version>/`, gitignored. `resolveBridge(ide)` returns the
   absolute path of the installed entry point, or throws a message naming the
   spec and the one command that installs it. Installation is explicit
   (`deno task acp-bridges`) and lazily triggered once per process, never per
   scenario; concurrent scenarios wait on one install, they do not race.
2. **Registry** carries the npm spec instead of an argv: `launch` becomes
   `{ package, version, bin }`, and `AcpAgent` asks the store for the command.
   The cache-key fingerprint keeps covering package and version.
3. **Claude traffic flag** added to `prepareAcpClaudeHome`'s returned env.
4. **App-server client** (`scripts/acceptance-tests/lib/appserver_client.ts`,
   new): NDJSON JSON-RPC over `codex app-server --stdio`; `initialize` →
   `thread/start` (`sandbox: "read-only"`, `ephemeral: true`, pinned model) →
   `turn/start` (`outputSchema`, `model`, `effort`) → final text from
   `item/completed` where `item.type === "agentMessage"`, end of turn from
   `turn/completed`. Verified against the protocol schema emitted by
   `codex app-server generate-json-schema` and by a live probe returning a
   schema-valid verdict object.
5. **`codexChatCompletion` reimplemented** on that client, same signature, so the
   judge, the user emulator and the benchmark human emulator change nothing. The
   turn ends on `turn/completed`, not on process exit.
6. **Prewarm**: the session is opened when the caller is created, not when the
   prompt is ready. In the runner the judge's thread opens as the agent run
   starts, so the 0.58 s handshake overlaps a scenario that lasts ~50 s. A
   prewarm failure degrades to opening the thread at call time and says so in
   the log.
7. Re-measure all four numbers after the change and record them in the SDS.
8. **One judge home per run** (added 2026-09-15 after the A/B). The judge's
   app-server child is keyed by its env, and the env carried the scenario's
   own `HOME`, so every scenario got a cold child. `runCodexJudgeHome()`
   memoises one home per process in a temp dir outside `$HOME`, and
   `buildJudgeConfig` passes that home alone — the scenario's `adapterEnv`
   no longer reaches the judge. Token cost is unchanged: each call still
   claims its own thread, so no history accumulates across scenarios.
