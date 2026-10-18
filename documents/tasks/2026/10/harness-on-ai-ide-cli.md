---
date: 2026-10-18
status: to do
implements: [FR-ACCEPT.ACP, FR-BENCH-SWE.IDE]
tags: [acceptance, benchmark, transport, ai-ide-cli]
related_tasks: [2026-06-migrate-acceptance-to-acp, 2026-09-fast-agent-cli-startup, 2026-10-claude-judge-over-acp]
---
# Drive acceptance tests and the SWE-rebench benchmark through ai-ide-cli

## Goal

The acceptance-test runner and the SWE-rebench benchmark stop carrying their
own agent transport and drive the IDE agents through `@korchasa/ai-ide-cli`,
the maintainer's own Deno wrapper over agent CLIs. One transport library is
maintained instead of two, and fixes made in the library reach the harness by
a lock refresh.

## Overview

### Context

- The user asked (2026-10-18): "переделай и acceptance тесты и бенчмарки на
  ai-ide-cli" — rework both the acceptance tests and the benchmarks onto
  ai-ide-cli.
- `@korchasa/ai-ide-cli` 2.0.0 is published on JSR (released 2026-10-18). It exposes one
  `RuntimeAdapter` per runtime (claude, codex, opencode, cursor) with
  `invoke` (one-shot) and `openSession` (multi-turn streaming input), and two
  transports: the native CLI transport (claude `stream-json`, codex
  `app-server`, opencode `serve`, cursor faux session) and an ACP transport
  (`transport: "acp"`) piloted for claude, codex and opencode.
- flowai today does not import ai-ide-cli anywhere. Both systems share one
  in-house ACP stack under `scripts/acceptance-tests/lib/acp/`
  (`AcpClient`, `AcpAgent`, `ACP_AGENTS` registry, `bridge_store`,
  `mock_bin`, `codex_rollout`, `codex_usage`, `auth`, `claude_judge`) plus a
  hand-written codex app-server client (`appserver_client.ts`) used by the
  judge and both human emulators (`llm.ts`).

### Current State

- Agent under test: `AcpAgent` (`scripts/acceptance-tests/lib/acp/acp_agent.ts`)
  spawns a pinned ACP bridge from the repo-local store under
  `setpgrp_exec.py`, attaches the process watchdog and health gate
  (FR-ACCEPT-GUARDS), drives a multi-turn session with the user emulator,
  auto-allows permissions, serves client-side fs confined to the sandbox, and
  renders a per-turn trace (reply, reasoning, tool calls in arrival order).
- Benchmark: `scripts/benchmark/run.ts` reuses `AcpAgent` for the codex arm.
- Judge and emulators: `codexChatCompletion` over `appserver_client.ts`
  (FR-ACCEPT.JUDGE-APPSERVER) or the claude ACP bridge (`claude_judge.ts`,
  FR-ACCEPT.JUDGE-ACP).
- Token usage: codex rollouts under `CODEX_HOME` for the agent, ACP
  `PromptResponse.usage` for the claude judge (FR-ACCEPT.TOKEN-USAGE).

### Constraints

- FR-ACCEPT-GUARDS (process group + watchdog + health gate),
  FR-ACCEPT-ISOLATION (bench-home per scenario), FR-ACCEPT-CACHE (the cache
  key covers transport and bridge versions), FR-BENCH-SWE.ISOLATION (bench
  codex store) and FR-ACCEPT.TOKEN-USAGE must keep holding.
- FR-ACCEPT.BRIDGE-LOCAL forbids `npx` at session time.
- Editing `scripts/acceptance-tests/lib/` invalidates every cached verdict
  once (FR-ACCEPT-CACHE hashes it).
- The other session's work in the same files (task
  `documents/tasks/2026/10/claude-judge-over-acp.md`) was committed and pushed
  before this task started (`98458f20`, merged in `e0643de1`), at the user's
  choice.
- User decisions (2026-10-18): (1) the agent, the judge and both emulators go
  through the library, the agent keeps the same pinned ACP bridge through the
  library's `acpFront` override, and every missing capability is added to the
  library and released to JSR; (2) switch at once — the old client is deleted
  in the same change, and parity is checked by the agent on 2–3 scenarios per
  IDE plus one benchmark instance, before and after.
- A push of a `feat:`/`fix:` commit to the library's `main` makes its CI cut a
  release and publish it to JSR (`ai-ide-cli/.github/workflows/ci.yml`,
  `publish-jsr` job). That publish is the release decision (1) asked for.

### Affected Surface

Scout report (`surface-scout`, verbatim):

````text
## Surface

Context found: flowai does not import `@korchasa/ai-ide-cli` anywhere today. `deno.json` has no import for it, and the only text mention is `framework/beta/skills/ai-ide-runner/references/runtimes.md:219,268`. Both the acceptance runner and the benchmark drive agents through a home-grown ACP stack, where ACP is the Agent Client Protocol (JSON-RPC over stdio) via `npm:@agentclientprotocol/sdk@1.3.0` and the bridges `claude-code-acp` and `codex-acp`. The judge and user emulator talk to the `codex` app-server through a second home-grown client. The library at `/Users/korchasa/www/flowai/ai-ide-cli` (v1.2.1) already ships overlapping pieces: `runtime/acp/*` (client, handshake, permissions, mapping, commands, content, errors, fronts), `runtime/index.ts` adapters (`claude`, `codex`, `cursor`, `opencode`), `codex/app-server.ts`, `runtime/spawn-env.ts`, `process-registry.ts`, and `claude/auth-env.ts` / `codex/auth-env.ts`. Its `deno.json` also lists the bridge packages `@agentclientprotocol/claude-agent-acp` and `@agentclientprotocol/codex-acp`.

### A. Acceptance runner, transport layer (`scripts/acceptance-tests/lib/`)
- ACP agent executor `acp/acp_agent.ts` (546 lines, plus `acp_agent_test.ts`) — spawns the bridge under `setpgrp_exec.py`, runs the watchdog and health gate, and drives initialize / session/new / session/prompt. It is the core transport and the main replacement site — `scripts/acceptance-tests/lib/acp/acp_agent.ts`.
- Home-grown ACP client `acp/client.ts` (504 lines, plus `client_test.ts`) — it overlaps `ai-ide-cli/runtime/acp/client.ts`. It captures tool calls, auto-allows permissions and maps errors to an exit code. `runner.ts`, `skill_invocation.ts` and `acp/acp_agent.ts` import `CapturedToolCall` and `TurnEvent` from it.
- Registry `acp/registry.ts` (plus `registry_test.ts`) — holds `ACP_AGENTS`, `ACP_LIB_VERSION`, `AcpIde`, `CommandPrefix`, `nativeCommandTurn` and `commandPrefixFor`. The `/` versus `$` prefix workaround for the codex bridge lives here, and the library has `runtime/commands.ts` and `runtime/acp/commands.ts` in the same area. Importers: `benchmark.ts`, `benchmark/predictions.ts`, `benchmark/run.ts`, `benchmark/operator.ts`, `benchmark/pool2_measure.ts`, `task-acp-bridges.ts`, `runner.ts`, `adapters/mod.ts`.
- Bridge store `acp/bridge_store.ts` (plus `_test`), `scripts/task-acp-bridges.ts`, the `.acp-bridges/` entry in `.gitignore:88-91`, and the `acp-bridges` task in `deno.json`. This is FR-ACCEPT.BRIDGE-LOCAL, a pinned local install of the bridges. The library pins its own bridge versions, so the two sets of pins can drift.
- Auth and home preparation `acp/auth.ts` (plus `auth_test.ts`; both currently modified in git) — holds `prepareAcpClaudeHome`, `prepareAcpCodexHome`, `prepareBenchCodexHome` and `prepareCodexJudgeHome`. The library's `claude/auth-env.ts`, `codex/auth-env.ts` and `runtime/spawn-env.ts` overlap here.
- Mock bin `acp/mock_bin.ts` (plus `_test`) — tool mocking by PATH-shadowing, with `writeLoginShellPathPrepend`. It is independent of the transport, but `acp_agent.ts` calls it.
- Rollout and usage collectors `acp/codex_rollout.ts` and `acp/codex_usage.ts` (plus `_test`) — they parse codex rollout files for traces and tokens. The library has `codex/transcript.ts`, `codex/items.ts`, `codex/events.ts` and `CliRunUsage`.
- Stub agent `acp/stub_agent.ts` — a fake ACP server used by tests, so it must follow whatever protocol the new client speaks.
- Claude judge over ACP `acp/claude_judge.ts` (plus `_test`, untracked) with `judge_transport.ts` (plus `_test`, untracked) — the transport selector for the judge and user emulator, FR-ACCEPT.JUDGE-ACP (SDS 3.4.7).
- App-server client `appserver_client.ts` (421 lines, plus `_test`), `llm.ts` (`loadConfig`, `closeCodexSessions`, `chatCompletion`, `ModelConfig`) and `testing/fake_appserver.ts`. This is FR-ACCEPT.JUDGE-APPSERVER (SDS 3.4.5), which spawns `codex app-server` directly with `Deno.Command` at `appserver_client.ts:144`. The library has `codex/app-server.ts` and `codex/app-server-internals.ts`.
- `cli-internals.ts` (plus `_test`, 275 lines) — it imports from the CLI internals and needs checking against the library's exports.
- `adapters/mod.ts` and `adapters/types.ts` — the `AgentAdapter` / `createAdapter` layer, which is now a thin shim over the registry, auth and `collectCodexUsage`. `run.ts` and `runner.ts` consume it.
- `runner.ts` (modified in git; `runner_test.ts`, `runner_packs_test.ts`, `runner_agents_md_test.ts` and `runner_timeout_test.ts` alongside) — it instantiates `AcpAgent`, `UserEmulator`, `judgeTransportFor` and `prewarmJudgeSession`. `skill_invocation.ts` (plus `_test`) reads `CapturedToolCall` for skill detection.
- `user_emulator.ts` (plus `_test`), `judge.ts` (plus `_test`) and `token_usage.ts` (plus `_test`) — they consume `chatCompletion` and the token breakdown shape.
- `agent_env.ts` (plus `_test`) — builds `agentLaunchEnv` and `codexAgentEnv`, which overlaps `runtime/spawn-env.ts`.
- `process_watchdog.ts`, `system_health.ts`, `setpgrp_exec.py` and `rss_bloat.py` — the FR-ACCEPT-GUARDS group guard. `ai-ide-cli/process-registry.ts` partly overlaps it. This is a keep-or-replace decision, and the setpgrp wrapper is a pre-condition of the current spawn.
- Trace modules `trace.ts`, `trace-collector.ts`, `trace-renderer.ts`, `trace-types.ts` and `trace-styles.ts` — they render the `TurnEvent` stream. A new event model from the library changes them.
- `evidence.ts`, `acceptance_runtime.ts`, `acceptance_cli.ts`, `acceptance_discovery.ts`, `acceptance_report.ts`, `acceptance_cache_precheck.ts` and `cache.ts` — consumers of the run result shape. `cache.ts` folds `ACP_LIB_VERSION` and the bridge versions into the cache key (FR-ACCEPT-CACHE), so a transport change invalidates cached verdicts.
- `scripts/task-acceptance-tests.ts` (modified in git) — the entry point that calls `loadConfig` and `closeJudgeSessions`.
- `acceptance-tests/config.json` (modified in git) — per-IDE models, effort and judge settings. It is not a code consumer but pins the transport behaviour.
- `framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts` (modified in git) — imports `closeCodexSessions`, `loadConfig` and `prepareCodexJudgeHome` directly. A scenario folder contains non-scenario code that depends on the lib API.
- `scripts/acceptance-tests/lib/utils.ts` — `copyFrameworkToIdeDir` and `writeRunFile`. It is used by `run.ts` and `judge.ts`.

### B. Benchmark (`scripts/benchmark/`, `scripts/benchmark.ts`)
- `benchmark/run.ts` — imports `AcpAgent`, `codexAgentEnv`, `createAdapter`, `prepareBenchCodexHome`, `copyFrameworkToIdeDir` and `AcpIde`. It is the main arm runner, `runArm`.
- `benchmark/pool2_measure.ts` — calls `runArm` and takes `AcpIde`. `benchmark.ts` at lines 35 and 301 takes `AcpIde` for `opts.ide`.
- `benchmark/predictions.ts` — imports `ACP_AGENTS`.
- `benchmark/operator.ts` and `benchmark/human_emulator.ts` (plus `_test`) — a scripted operator that implements the `AcpAgent.run(userEmulator)` contract. They import `@acceptance-tests/llm.ts` (`codexChatCompletion`) and the registry `CommandPrefix`.
- `benchmark/metrics.ts` (plus `_test`), `webaudit.ts` (plus `_test`) and `peek_audit.ts` (plus `_test`) — they parse the session transcripts (codex rollout or claude jsonl) written by the agent. If the transport changes, the transcript location and format may change with it.
- `benchmark/prepare_sandbox.ts`, `install_env.ts`, `agents_md.ts`, `sandbox_root.ts`, `cells.ts`, `cells_import.ts`, `cell_select.ts`, `retro.ts`, `verify.ts`, `rebench.ts`, `setup.ts`, `pool2_*.ts`, `patch.ts` and `dataset.ts` — these only run git, docker, python and shell, not agents (`Deno.Command` calls at `prepare_sandbox.ts:15`, `install_env.ts:127,143`, `verify.ts:99`, `rebench.ts:74,99`, `pool2_gate.ts:175`, `setup.ts:15`). Not affected by the transport. They pass through `AcpIde` and `runArm` types only.
- `scripts/benchmark/pool2_campaign.sh` and `pool2_opus_probe.sh` — shell drivers that invoke `deno task benchmark`. Worth a glance for CLI flags and for any IDE or bridge assumptions.
- Result artifacts: the `scripts/benchmark/cells/` JSON, `pool2_provenance.json` (modified in git), the top-level `baseline.pool2-*.json` / `flowai.pool2-*.json` files, and `scripts/project-status.py` (reads the cells). The cache key and transport fingerprint may change, which would make old cells non-comparable (FR-BENCH-SWE.SYMMETRY).

### C. Config, build and gates
- `deno.json` — needs the new import for `@korchasa/ai-ide-cli`, whether JSR or a local path. The `@agentclientprotocol/sdk` import and the `@acceptance-tests/` alias are also here. The `acp-bridges` task stays or goes with the bridge-store decision.
- `deno.lock`.
- `scripts/task-check.ts` — the `--ignore` flag list in the drift triplet with `deno.json` lint and fmt. `runner_test.ts` is excluded from the gate, and fakes there cast with `as unknown as` and would break silently.
- `.github/workflows/ci.yml` — must be able to resolve the dependency. CI runs on ubuntu-latest, and the project rule about host-only binaries applies.
- `.gitignore` (`.acp-bridges/`).
- `scripts/check-srs-evidence_test.ts` — mentions ACP.

### D. Documentation (SRS and SDS must be updated before code)
- `documents/requirements.md` (modified in git): FR-ACCEPT.ACP (line 762 and following), FR-ACCEPT.BRIDGE-LOCAL (~777), the FR-ACCEPT.JUDGE-APPSERVER block (~786), FR-ACCEPT.JUDGE-ACP, FR-ACCEPT-GUARDS (~632), FR-ACCEPT-ISOLATION, FR-ACCEPT-CACHE, FR-ACCEPT.TOKEN-USAGE, FR-BENCH-SWE.IDE / SYMMETRY, and the superseded OpenCode adapter FR (~756). Every FR needs an `Acceptance:` reference and code comments `// FR-...` for traceability.
- `documents/design.md` (modified in git): SDS 3.4 (line 271), 3.4.1, 3.4.2, 3.4.4 (local bridge store), 3.4.5 (app-server transport), 3.4.6 (token accounting), 3.4.7 (claude judge transport), 3.22 (SWE-rebench), and probably 3.0 and 3.1.1.
- `AGENTS.md` (modified in git; `CLAUDE.md` is a symlink) — the Test Systems and Architecture sections, and the codex rollout / claude jsonl diagnosis commands in "Diagnosing Failures".
- `README.md` (modified in git) — Development Setup and benchmark commands.
- `framework/core/assets/AGENTS.template.md` (modified in git) — probably unaffected, but it mentions the runner.
- `framework/beta/skills/ai-ide-runner/references/runtimes.md:219,268` — the one existing mention of the library. It is a framework skill reference, not dev code.
- A new task file under `documents/tasks/2026/10/` is needed (GODS format). Existing related untracked drafts: `documents/tasks/2026/10/claude-judge-over-acp.md` and `documents/tasks/2026/09/codex-arm-gpt-6-luna.md`.
- The library side: `/Users/korchasa/www/flowai/ai-ide-cli/README.md:405` ("Alternate Transport (ACP)") and `README.md:578` ("Reference consumers") list consumers. `documents/` and `CHANGELOG.md` in the library may need an entry if the library gains features.

### E. Library side (`/Users/korchasa/www/flowai/ai-ide-cli`)
- `runtime/acp/*` (client, handshake, permissions, commands, content, mapping, errors, fronts) and `runtime/index.ts`, with `getRuntimeAdapter`, `RuntimeInvokeOptions` and `RuntimeSession` (`openSession`) — candidates for the replacement. `mod.ts` and `deno.json` exports: the `runtime/acp/*` modules are not in the exports map I saw, which lists only `runtime`, `claude/*`, `codex/*` and so on. Check whether an export is needed.
- `process-registry.ts` (scoped process kill), `runtime/spawn-env.ts` and `inheritEnv:false` — relevant to FR-ACCEPT-ISOLATION.
- `e2e/_helpers.ts`, `e2e/_auth.ts` and `e2e/acp_*_e2e_test.ts` — a second copy-adapted auth and ACP-smoke harness that parallels flowai's `acp/auth.ts` and `acp_agent.ts`.

### F. Not affected (opened)
- `scripts/benchmark/runs/**/_repo-cache/**` — cloned third-party repos from the benchmark data. They contain "acp" only as unrelated source files.
- `scripts/build-plugins.ts` and `sync-plugins-local.ts` — generic spawn helpers for git and plugin sync, not agent transport.
- `framework/**/acceptance-tests/*/mod.ts` scenarios (other than the calibration `calibrate.ts` above) — they consume `AcceptanceTestScenario` / `BenchmarkScenario` types and not the transport. Needs a check on whether the types in `types.ts` change.

## Queries used
- `ls` of the repo root, `scripts/`, `scripts/acceptance-tests/lib/` and `scripts/benchmark/` and the sibling library root.
- `grep -rln ai-ide-cli` over ts, json, md and yml.
- `grep -E "Deno.Command|spawn|app-server|acp"` over `scripts/**/*.ts`.
- `grep` for the `@acceptance-tests/acp/`, `appserver_client`, `cli-internals` and `llm.ts` import sites.
- `grep` for FR-ACCEPT.ACP, FR-BENCH-SWE, SDS 3.4.x and 3.22 in the SRS and SDS.
- `grep` for `ACP_LIB_VERSION`, `acp-bridges` and `.gitignore` entries.
- Reading the heads of `acp_agent.ts` and `registry.ts`, the library `deno.json`, `mod.ts` and the README headings, and listings of `ai-ide-cli/runtime/`, `runtime/acp/` and `e2e/`.

## Not examined (budget)
- None strictly. I did not read the bodies of `client.ts`, `appserver_client.ts`, `cli-internals.ts` or `run.ts`, so the exact API-for-API mapping to the library is unverified.
- I did not open `scripts/benchmark/pool2_campaign.sh` or `pool2_opus_probe.sh`.
- I did not check the `framework/*/acceptance-tests/*/mod.ts` scenarios individually for transport-specific fields.

## Could not rule out
- "Benchmarks" might also mean the skill-trigger benchmarks (SDS 3.4.3 / FR-ACCEPT.TRIGGER), which are part of the acceptance runner. They share the same transport, so they are probably included.
- The library may lack features the runner depends on: the setpgrp process-group wrapper, PATH-shadow mocking, auto-allow of permission requests, bench-home isolation (HOME swap with a keychain symlink), codex `$` versus `/` command prefix handling, and token accounting from the codex rollout. If so, the library itself would need changes.
- The judge currently uses `codex app-server` with `ephemeral: true`. It is unclear whether the library's `codex/app-server.ts` is a drop-in replacement.
- Cached verdicts in `acceptance-tests/cache/` and benchmark cells may be invalidated or become incomparable after the transport switch.
- Copy-adapted code in `ai-ide-cli/e2e/_auth.ts` against `scripts/acceptance-tests/lib/acp/auth.ts` may have diverged, so reconciling them could pull in extra changes.
````

Dispositions (union of the scout list and my own, for the chosen variant):

- `acp/acp_agent.ts` + test — covered-by Solution step F2 (DoD "agent under test")
- `acp/client.ts` + test — covered-by Solution step F1 (deleted; trace capture moves to `acp/turn_recorder.ts`, fs anchoring moves upstream as L3)
- `acp/registry.ts` + test — covered-by Solution step F6 (launch specs stay as the `acpFront` source; `ACP_LIB_VERSION` becomes the library version; `nativeCommandTurn` / `commandPrefixFor` unchanged)
- `acp/bridge_store.ts`, `scripts/task-acp-bridges.ts`, `.gitignore` `.acp-bridges/`, `deno.json` `acp-bridges` task — not affected — the store keeps supplying the pinned bridge command, now handed to the library as `acpFront` (`acp_agent.ts:182` `resolveBridgeCommand`); FR-ACCEPT.BRIDGE-LOCAL holds as is
- `acp/auth.ts` + test — not affected — it prepares bench-home and `CODEX_HOME` directories and returns env; the env still reaches the spawn through the library `env` option (`runtime/session-types.ts:64`)
- `acp/mock_bin.ts` + test — not affected — PATH-shadowing reaches the agent through the `env` option, which the library passes to the spawn (`runtime/session-types.ts:64`)
- `acp/codex_rollout.ts`, `acp/codex_usage.ts` + tests — not affected — they read rollout files under `CODEX_HOME`, which the same codex bridge keeps writing (`acp_agent.ts:319` reads after teardown)
- `acp/stub_agent.ts` — covered-by Solution step F2 (stays an ACP agent on the SDK's agent side; the tests launch it through `acpFront`)
- `acp/claude_judge.ts` + test, `judge_transport.ts` + test — covered-by Solution step F4 (claude judge deleted; its policy moves into `judge_transport.ts` on the library session)
- `appserver_client.ts` + test, `llm.ts` + test, `testing/fake_appserver.ts` — covered-by Solution step F5 (framing and spawn deleted; thread/turn logic moves into `llm.ts` on the library `CodexAppServerClient`; the fake becomes an executable stub for the library `binary` option)
- `cli-internals.ts` + test — not affected — imports only `@std/yaml` and `@std/toml` (`cli-internals.ts:11-12`), no transport code
- `adapters/mod.ts`, `adapters/types.ts` — covered-by Solution step F2 (`ParsedAgentOutput` shape kept; checked by `deno task check`)
- `runner.ts` + runner tests, `skill_invocation.ts` + test — covered-by Solution step F1/F2 (they import `CapturedToolCall` / `TurnEvent`, which move to `turn_recorder.ts`; `runner_test.ts` is run by hand, DoD item "excluded test modules")
- `user_emulator.ts`, `judge.ts`, `token_usage.ts` + tests — covered-by Solution step F4 (they call `chatCompletion`, whose signature is unchanged; `tokensFromAcpUsage` fed from the library turn-end usage)
- `agent_env.ts` + test — not affected — builds env maps only; the maps go into the library `env` option unchanged
- `process_watchdog.ts`, `system_health.ts`, `setpgrp_exec.py`, `rss_bloat.py` — covered-by Solution step F3 (process group from the library `processGroup: true`; watchdog fed the pid through a `ProcessRegistry` subclass; the ACP agent and judge spawns stop going through `setpgrp_exec.py`, but the file stays: `process_watchdog_test.ts:17` spawns through it and `process_watchdog.ts:20,130,296` documents that role)
- Trace modules `trace*.ts` — not affected — they render `ParsedAgentOutput` and the log text `AcpAgent` produces, whose format the recorder keeps (`renderTurnTrace` stays in `acp_agent.ts`)
- `evidence.ts`, `acceptance_*.ts` — not affected — they consume the run result shape, which `AcpAgent.run()` keeps (`{ code, logs }`)
- `cache.ts` — covered-by Solution step F6 (the library version replaces the SDK version in the key)
- `scripts/task-acceptance-tests.ts` — not affected — calls `loadConfig` and `closeJudgeSessions`, both kept with the same signatures
- `acceptance-tests/config.json` — not affected — models, effort and judge settings are transport-neutral values
- `framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts` — covered-by Solution step F5 (imports `closeCodexSessions`, `loadConfig`, `prepareCodexJudgeHome`; signatures kept, checked by `deno task check`)
- `scripts/acceptance-tests/lib/utils.ts` — not affected — `copyFrameworkToIdeDir` and `writeRunFile` are file helpers with no transport code (scout row B, `run.ts` imports)
- `benchmark/run.ts` — covered-by Solution step F2 (constructs `AcpAgent` with the same options; DoD "benchmark instance")
- `benchmark/pool2_measure.ts`, `scripts/benchmark.ts` — not affected — they pass the `AcpIde` type, which stays in `registry.ts`
- `benchmark/predictions.ts` — covered-by Solution step F6 (reads `ACP_AGENTS` for the bridge version; the table stays)
- `benchmark/operator.ts`, `benchmark/human_emulator.ts` + tests — covered-by Solution step F5 (`codexChatCompletion` keeps its signature)
- `benchmark/metrics.ts`, `webaudit.ts`, `peek_audit.ts` + tests — not affected — they parse codex rollouts, which the same bridge writes to the same `CODEX_HOME`
- Benchmark git/docker/python helpers (`prepare_sandbox.ts`, `install_env.ts`, … `dataset.ts`) — not affected — they spawn git, docker, python and shell only (`prepare_sandbox.ts:15`, `install_env.ts:127,143`, `verify.ts:99`, `rebench.ts:74,99`, `pool2_gate.ts:175`, `setup.ts:15`)
- `pool2_campaign.sh`, `pool2_opus_probe.sh` — not affected — they call `deno task benchmark`; the only transport mention is an error-text comment (`pool2_campaign.sh:9`, ACP `-32000` auth failure, which the same bridge still raises)
- Benchmark result artefacts (`cells/`, `pool2_provenance.json`, `project-status.py`) — not affected — the cell key holds the bridge version and harness commit, not the client library (FR-BENCH-SWE.CELLS). The parity run would still write into them by default: `pool2-run` stamps the committed `pool2_provenance.json` unconditionally (`benchmark.ts:431`), `--cells` defaults to the committed root (`benchmark.ts:291`), and `--rep` is a number, not a path (`benchmark.ts:248`) — covered-by DoD item "Parity: one benchmark instance" (scratch `--out` and `--cells`, provenance copied before and restored from the copy)
- `deno.json`, `deno.lock` — covered-by Solution step F7
- `scripts/task-check.ts` — not affected — its `--ignore` list names test paths; no path is added or removed
- `.github/workflows/ci.yml` — not affected — CI runs `deno task check`, which resolves a JSR import without extra setup
- `scripts/check-srs-evidence_test.ts` — not affected — it uses `acp/client_test.ts` only as a literal string inside fixture SRS text (`check-srs-evidence_test.ts:34,39`), not as a real path
- SRS clauses FR-ACCEPT.ACP, FR-ACCEPT-GUARDS, FR-ACCEPT.JUDGE-APPSERVER, FR-ACCEPT.JUDGE-ACP, FR-BENCH-SWE.IDE — covered-by Solution step D1
- SRS FR-ACCEPT-ISOLATION, FR-ACCEPT-CACHE, FR-ACCEPT.TOKEN-USAGE, FR-ACCEPT.BRIDGE-LOCAL, FR-BENCH-SWE.SYMMETRY — covered-by Solution step D1 (re-read; edited only where they name the deleted files)
- SDS §3.4, §3.4.1 (`acpLibVersion` in the cache key, `design.md:329`), §3.4.2, §3.4.4, §3.4.5, §3.4.6 (usage source `appserver_client.ts`, `design.md:435`), §3.4.8, §3.22 — covered-by Solution step D2
- SDS §3.0, §3.1.1 — not affected — `grep -n -E "acp/client|AcpClient|appserver_client|claude_judge|setpgrp_exec|ACP_LIB_VERSION" documents/design.md` hits only lines 277–458 and 743, all inside §3.4 and §3.22
- SRS FR-ACCEPT.OPENCODE (superseded, `requirements.md:756`) — not affected — history only; the same grep over `requirements.md` has no hit inside it
- SRS evidence and acceptance lines that cite deleted tests: FR-ACCEPT-ISOLATION (`requirements.md:622,624`, `client_test.ts`), FR-ACCEPT.ACP (`:771,772`), FR-ACCEPT.JUDGE-APPSERVER (`:789`), FR-ACCEPT.JUDGE-ACP (`:798`), FR-ACCEPT.TOKEN-USAGE (`:808`) — covered-by Solution step D1 (re-pointed at the flowai tests that replace them; `check-srs-evidence` needs the path on disk, so a library test path cannot stand in)
- `documents/acceptance-testing.md:54-55` (`client.ts`/`AcpClient`, spawn under `setpgrp_exec.py`) — covered-by Solution step D2
- `AGENTS.md`, `README.md` — covered-by Solution step D3
- `framework/core/assets/AGENTS.template.md` — not affected — it describes the user project's own commands, not this repo's runner
- `framework/beta/skills/ai-ide-runner/references/runtimes.md` — not affected — a framework skill reference for end users, not harness code (scout row D)
- Library side: `ai-ide-cli` `runtime/acp/*`, `runtime/session-types.ts`, `runtime/adapter-types.ts`, SRS/SDS, CHANGELOG via release — covered-by Solution steps L1–L6
- Library `runtime/acp/mapping.ts:152-155` comment that declines fs "per ADR-0002" — covered-by Solution step L3 (`grep -n -i -E "\bfs\b|file ?system" documents/adr/2026-05-02-remove-hitl.md` in the library prints nothing: the ADR removes HITL and never rules on fs, so the comment is corrected, no ADR is amended)
- Library `e2e/_auth.ts` duplicate auth harness — not affected — e2e-only helper of the library, not imported by flowai
- Skill-trigger scenarios (FR-ACCEPT.TRIGGER) — covered-by Solution step F2 (same transport)
- Foreign uncommitted work in the same files (task `claude-judge-over-acp`) — not affected — committed and pushed before this task (`98458f20`, merged in `e0643de1`)

## Definition of Done

- [ ] Library answers an ACP permission request in the shape the protocol defines (`{ outcome: { outcome: "selected", optionId } }`).
  - FR: library FR-L54
  - Test: `ai-ide-cli/runtime/acp/permissions_test.ts::answers in the protocol's outcome shape`
  - Evidence: `cd ../ai-ide-cli && deno test -A runtime/acp/permissions_test.ts runtime/acp/inbound_test.ts`
- [ ] Library ACP session honours `onToolUseObserved`; a non-ACP session transport that cannot honour it rejects it instead of dropping it.
  - FR: library FR-L55
  - Test: `ai-ide-cli/runtime/acp/adapter_test.ts::session permission requests reach onToolUseObserved`
  - Evidence: `cd ../ai-ide-cli && deno test -A runtime/acp/adapter_test.ts runtime/session_contract_test.ts`
- [ ] Library serves `fs/read_text_file` and `fs/write_text_file` when `acpClientFs` is set: a relative path resolves against the session cwd, a write outside `writeRoot` is refused; without the option the capability stays declined.
  - FR: library FR-L56
  - Test: `ai-ide-cli/runtime/acp/inbound_test.ts::client fs anchors relative paths and refuses writes outside writeRoot`
  - Evidence: `cd ../ai-ide-cli && deno test -A runtime/acp/inbound_test.ts runtime/acp/mapping_test.ts`
- [ ] Library forwards `acpSessionMeta` as `_meta` on `session/new` and `session/load`.
  - FR: library FR-L57
  - Test: `ai-ide-cli/runtime/acp/mapping_test.ts::session/new carries acpSessionMeta as _meta`
  - Evidence: `cd ../ai-ide-cli && deno test -A runtime/acp/mapping_test.ts`
- [ ] Library lets one ACP bridge process serve many sessions: `openAcpConnection` spawns and initialises once, each `openSession` on it sends its own `session/new`, every update and inbound request reaches only the session whose `sessionId` it carries, and `close()` ends the process.
  - FR: library FR-L58
  - Test: `ai-ide-cli/runtime/acp/connection_test.ts::two sessions share one process and see only their own updates`
  - Evidence: `cd ../ai-ide-cli && deno test -A runtime/acp/connection_test.ts runtime/acp/adapter_test.ts`
- [ ] Library `deno task check` is green, the SRS carries one FR per addition, and the release is on JSR.
  - FR: library FR-L54..FR-L58
  - Test: `ai-ide-cli` `deno task check`
  - Evidence: `cd ../ai-ide-cli && deno task check > "$SCRATCH/lib-check.log" 2>&1; echo "EXIT: $?"`; `curl -s https://jsr.io/@korchasa/ai-ide-cli/meta.json | jq -r .latest` prints the new version
- [ ] Acceptance tests drive the agent under test through ai-ide-cli.
  - FR: FR-ACCEPT.ACP
  - Test: `scripts/acceptance-tests/lib/acp/acp_agent_test.ts` against `stub_agent.ts` — `runs a turn through the library session`, `a global timeout keeps the partial log`, `a dispatch's result reaches the trace`, `a client-fs write outside the sandbox is refused`, `turn-end stop reason and usage reach the result` — and `turn_recorder_test.ts` (moved capture tests)
  - Evidence: `grep -c "@korchasa/ai-ide-cli" scripts/acceptance-tests/lib/acp/acp_agent.ts` ≥ 1; `test ! -e scripts/acceptance-tests/lib/acp/client.ts`; `deno test -A scripts/acceptance-tests/lib/acp/`
- [ ] The judge and both emulators run through ai-ide-cli.
  - FR: FR-ACCEPT.JUDGE-ACP, FR-ACCEPT.JUDGE-APPSERVER
  - Test: `scripts/acceptance-tests/lib/judge_transport_test.ts` — `calls on one key share one bridge process`, `the pinned effort reaches _meta.claudeCode.options`, `judge usage comes from the turn-end event` — and `scripts/acceptance-tests/lib/llm_test.ts`
  - Evidence: `test ! -e scripts/acceptance-tests/lib/appserver_client.ts && test ! -e scripts/acceptance-tests/lib/acp/claude_judge.ts`; `grep -c "@korchasa/ai-ide-cli" scripts/acceptance-tests/lib/llm.ts scripts/acceptance-tests/lib/judge_transport.ts` ≥ 1 each; `deno test -A scripts/acceptance-tests/lib/llm_test.ts scripts/acceptance-tests/lib/judge_transport_test.ts scripts/benchmark/human_emulator_test.ts`
- [ ] The SWE-rebench benchmark drives its codex arm through ai-ide-cli.
  - FR: FR-BENCH-SWE.IDE
  - Test: `scripts/benchmark/run_test.ts`, `scripts/benchmark/operator_test.ts`
  - Evidence: `grep -n "new AcpAgent" scripts/benchmark/run.ts` (the arm runner still goes through the rewritten `AcpAgent`); `deno test -A scripts/benchmark/run_test.ts scripts/benchmark/operator_test.ts`
- [ ] The guards still hold: the agent runs in its own process group, the watchdog kills the whole tree, and the health gate refuses a spawn.
  - FR: FR-ACCEPT-GUARDS
  - Test: `scripts/acceptance-tests/lib/acp/acp_agent_test.ts::the watchdog follows the child the library spawns`, `process_watchdog_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts scripts/acceptance-tests/lib/acp/acp_agent_test.ts`
- [ ] No `npx` and no unpinned bridge at session time.
  - FR: FR-ACCEPT.BRIDGE-LOCAL
  - Test: `scripts/acceptance-tests/lib/acp/bridge_store_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/bridge_store_test.ts scripts/acceptance-tests/lib/acp/registry_test.ts`
- [ ] The cache key carries the library version instead of the ACP SDK version.
  - FR: FR-ACCEPT-CACHE
  - Test: `scripts/acceptance-tests/lib/acp/registry_test.ts::the library version matches deno.lock`, `cache_test.ts::acp transport participates in cache key`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/cache_test.ts scripts/acceptance-tests/lib/acp/registry_test.ts`
- [ ] flowai imports the library from JSR, never from a local path.
  - FR: FR-ACCEPT.ACP
  - Test: `jq` check below (config, no test module)
  - Evidence: `jq -r '.imports["@korchasa/ai-ide-cli"]' deno.json` starts with `jsr:@korchasa/ai-ide-cli@^`
- [ ] Parity (smoke, one run per side — it catches a broken transport, not a subtle one; the transport paths themselves are pinned by the stub-agent tests above): the same scenarios give the same verdict before and after, on both IDEs. Before runs on HEAD in a scratch worktree, after on the change.
  - FR: FR-ACCEPT.ACP
  - Test: Benchmark: `draw-mermaid-diagrams-sequence`, `select-llm-model-fails-fast-no-fetch`, `write-prd-basic`
  - Evidence: `deno task acceptance-tests -f <id> --no-cache` and `-i codex` for `draw-mermaid-diagrams-sequence`, `select-llm-model-fails-fast-no-fetch`, `write-prd-basic`; verdicts recorded in this file under `## Parity`
- [ ] Parity: one benchmark instance ends with the same exit code and a non-empty patch before and after.
  - FR: FR-BENCH-SWE.IDE
  - Test: manual — korchasa reads the recorded exit codes and patch sizes
  - Evidence: `cp scripts/benchmark/pool2_provenance.json "$SCRATCH/prov.json"`; `deno task benchmark pool2-run --arm baseline --ide codex --model gpt-6-luna --instance agronholm__anyio-1121 --out "$SCRATCH/bench-<side>" --cells "$SCRATCH/cells-<side>"` on HEAD (scratch worktree) and on the change; `cp "$SCRATCH/prov.json" scripts/benchmark/pool2_provenance.json` after each; `git diff --quiet scripts/benchmark/ && echo clean`; exit code, grade and patch size recorded under `## Parity`
- [ ] The excluded test modules pass by hand.
  - FR: FR-ACCEPT.ACP
  - Test: `scripts/acceptance-tests/lib/runner_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_test.ts`
- [ ] SRS, SDS, `acceptance-testing.md`, `AGENTS.md` and `README.md` describe the library-based transport and name no deleted file or test; no ACP spawn goes through `setpgrp_exec.py` any more.
  - FR: FR-ACCEPT.ACP, FR-ACCEPT-GUARDS
  - Test: `grep` checks below
  - Evidence: `grep -rn -E "appserver_client(_test)?\.ts|claude_judge(_test)?\.ts|acp/client(_test)?\.ts|AcpClient|@zed-industries/agent-client-protocol" documents/requirements.md documents/design.md documents/acceptance-testing.md AGENTS.md README.md` prints nothing; `grep -n setpgrp_exec scripts/acceptance-tests/lib/acp/*.ts scripts/acceptance-tests/lib/judge_transport.ts` prints nothing; `grep -n "every spawn is wrapped" documents/requirements.md` prints nothing (the guard text names which spawns use the wrapper)
- [ ] flowai `deno task check` is green.
  - FR: FR-ACCEPT.ACP
  - Test: `deno task check`
  - Evidence: `deno task check > "$SCRATCH/check.log" 2>&1; echo "EXIT: $?"` and the `N passed | 0 failed` lines

## Solution

### Library (`../ai-ide-cli`, released as the next minor)

- **L1 — permission answer shape (`fix(acp)`).** `runtime/acp/permissions.ts` builds `{ outcome: { type: … } }`; the ACP schema (`RequestPermissionOutcome` in `@agentclientprotocol/sdk` `types.gen.d.ts:3956`) discriminates on `outcome`. Rename the field in `AcpPermissionResponse` and every return; update `permissions_test.ts`, `inbound_test.ts`, `client_test.ts`. RED first: a test asserting the protocol shape.
- **L2 — `onToolUseObserved` for sessions (`feat(acp)`).** Add the field to `RuntimeSessionOptions`; `openSessionViaAcp` passes it to `createPermissionHandler` (today the session handler gets none and rejects every request, `adapter.ts` `openSessionViaAcp`). Session transports that have no permission channel add it to their unsupported list so a caller is told, not ignored.
- **L3 — client filesystem (`feat(acp)`).** New option `acpClientFs?: { writeRoot: string }` on invoke and session options. When set: `buildInitializeParams` declares `fs.readTextFile`/`writeTextFile: true`, and `createInboundRequestHandler` serves `fs/read_text_file` (relative path anchored to the session cwd) and `fs/write_text_file` (anchored, then refused outside `writeRoot`). The anchoring rules are flowai's `resolveSessionPath` / `confineWritePath`, moved with their tests. Absent → today's behaviour (declined, `-32601`). The `mapping.ts:152-155` comment that cites ADR-0002 for declining fs is rewritten: the ADR removes HITL and says nothing about fs.
- **L4 — session `_meta` (`feat(acp)`).** New option `acpSessionMeta?: Record<string, unknown>`; `buildSessionNewParams` adds it as `_meta`, so `session/load` carries it too.
- **L6 — one bridge, many sessions (`feat(acp)`).** New `openAcpConnection(runtime, opts)` exported from `./runtime`: spawns the front and runs `initialize` once; `connection.openSession(sessionOpts)` sends `session/new` and returns a `RuntimeSession` whose event queue gets only notifications carrying its `sessionId`; inbound requests (permission, fs) are routed the same way; `close()` ends the process. `openSessionViaAcp` becomes a connection of one session, so its behaviour is unchanged. This is what FR-ACCEPT.JUDGE-ACP needs: today every `openSession` spawns its own process (`adapter.ts:686`), while the SRS keeps one bridge per `[model, effort, env, cwd]` (0.36–1.23 s per spawn, FR-ACCEPT.BRIDGE-LOCAL).
- **L5 — docs and release.** One FR per addition in the library SRS (next free ids after FR-L53), SDS notes, README "Alternate Transport (ACP)" options. `deno task check` green, push to `main`; CI cuts the minor and publishes to JSR. flowai waits for the JSR version.

### flowai

- **F1 — trace capture without a client.** New `scripts/acceptance-tests/lib/acp/turn_recorder.ts` takes the raw `session/update` params from the library `onEvent` and keeps what `AcpClient` kept: reply and reasoning buffers, the arrival-order timeline, tool calls merged across `tool_call` / `tool_call_update` (`flattenRawOutput`, `flattenToolCallContent`, `CapturedToolCall`, `TurnEvent`). The library does not validate frames, so the raw-tap workaround is no longer needed. `client.ts` and `client_test.ts` are deleted; capture tests move to `turn_recorder_test.ts`, fs tests went upstream in L3.
- **F2 — `AcpAgent` on the library.** The synthetic `turn-end` (stop reason, usage) reaches only the session's event iterator, never `onEvent` (`adapter.ts:617-624` vs `727-737`), so each turn also drains `session.events` up to its `turn-end`. `run()` keeps its contract (`{ code, logs }`, health gate, mock bin, per-turn trace, partial log, codex rollout tail). The spawn becomes `getRuntimeAdapter(ide).openSession({ transport: "acp", acpFront: <bridge_store command + registry env>, cwd: workspace, env, processGroup: true, processRegistry, onToolUseObserved: () => "allow", acpClientFs: { writeRoot: workspace }, onEvent: recorder, onStderr: log })`; each turn is `session.send(text)` followed by that drain; a send that throws is the `subtype:"error"` verdict it was before. Model selection stays in env (`ANTHROPIC_MODEL`, `CODEX_CONFIG`) exactly as today, so the handshake asks the bridge for nothing new. `stub_agent.ts` stays the test agent, launched through `acpFront`.
- **F3 — guards.** A `ProcessRegistry` subclass in `acp_agent.ts` starts the watchdog on the child the library registers (pgid == pid under `processGroup: true`) and stops it on unregister; teardown still kills the group. The `setpgrp_exec.py` wrapper leaves the agent and judge spawns; the file stays for `process_watchdog_test.ts`.
- **F4 — claude judge.** `claudeChatCompletion`, its prewarm and its close move into `judge_transport.ts`. The pool keeps one library connection (L6) per `[model, effort, env, cwd]`, as FR-ACCEPT.JUDGE-ACP requires; each call opens its own session on it with `acpSessionMeta: { claudeCode: { options: { tools: [], settingSources: [], systemPrompt, effort } } }` — `effort` is `config.effort ?? DEFAULT_CLAUDE_EFFORT`, as `claude_judge.ts` sends today — and one spare session per key is opened ahead. The reply's schema check stays; usage comes from the `turn-end` read off the session's event iterator. `claude_judge.ts` + test are deleted; tests move to `judge_transport_test.ts`.
- **F5 — codex judge and emulators.** `llm.ts` keeps one app-server child per key, as FR-ACCEPT.JUDGE-APPSERVER requires (the measured gain is per child), but drives it through the library `CodexAppServerClient` (`jsr:@korchasa/ai-ide-cli/codex/app-server`): `thread/start` (read-only, ephemeral, model, cwd) and `turn/start` (model, effort, outputSchema) as today. `appserver_client.ts` + test are deleted; `testing/fake_appserver.ts` becomes an executable stub passed as `binary`.
- **F6 — versions and cache.** `ACP_LIB_VERSION` becomes the ai-ide-cli version, pinned by a registry test against `deno.lock`; `cache.ts` folds it in. `ACP_AGENTS` and the bridge pins stay.
- **F7 — dependency.** `deno.json` imports `@korchasa/ai-ide-cli` as `jsr:@korchasa/ai-ide-cli@^<new minor>`; `@agentclientprotocol/sdk` stays only for `stub_agent.ts`. During development a local path may stand in; the commit carries the JSR form only.
- **D1 — SRS.** FR-ACCEPT.ACP (transport now via the library), FR-ACCEPT-GUARDS (process group from `processGroup`), FR-ACCEPT.JUDGE-APPSERVER and FR-ACCEPT.JUDGE-ACP (transport and acceptance commands), FR-BENCH-SWE.IDE (drop limitation 1, the client that refused `session_info_update` is gone); FR-ACCEPT-GUARDS says which spawns still use `setpgrp_exec.py`; every `Evidence:` / `Acceptance:` line that cites a deleted test (FR-ACCEPT-ISOLATION, FR-ACCEPT.ACP, FR-ACCEPT.JUDGE-APPSERVER, FR-ACCEPT.JUDGE-ACP, FR-ACCEPT.TOKEN-USAGE) is re-pointed at its flowai replacement; `**Tasks:**` back-pointers to this file on FR-ACCEPT.ACP and FR-BENCH-SWE.IDE.
- **D2 — SDS.** §3.4, §3.4.1 (`acpLibVersion` is the ai-ide-cli version), §3.4.2, §3.4.4, §3.4.5, §3.4.6 (usage source), §3.4.8, §3.22 describe the library path; `documents/acceptance-testing.md:54-55` likewise.
- **D3 — AGENTS.md / README.** Architecture line and any mention of the deleted files.
- **Order.** L1–L6 first (library green and published), then F1–F7 against the published version, then the parity runs, then D1–D3, then `deno task check`.

## Parity

<!-- filled during Implement: before/after verdicts -->

## Follow-ups
