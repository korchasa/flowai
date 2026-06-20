---
date: "2026-06-20"
status: to do
implements:
  - FR-ACCEPT.ACP
  - FR-ACCEPT-ISOLATION
tags: [acceptance-tests, acp, adapters, transport, refactor]
related_tasks:
  - 2026/06/opencode-acceptance-adapter.md
---

# Migrate Acceptance-Test IDE Control From Direct CLI To ACP

## Goal

Replace the per-IDE direct-CLI control layer of the acceptance-test runner with a
single Agent Client Protocol (ACP) transport. Driver (user-stated): **shrink our
own codebase**, **standardize on the ACP protocol**, **cut per-IDE adapter cost**,
and **onboard new IDEs faster**. End-state: one ACP client + a data-only agent
registry instead of four hand-written `AgentAdapter` classes, each re-parsing an
IDE-specific `stream-json` dialect and mocking via IDE-specific hooks.

## Overview

### Context

Today the runner controls each IDE as a **black box via its native CLI**:
`SpawnedAgent` (`scripts/acceptance-tests/lib/spawned_agent.ts`) spawns the IDE
binary with `Deno.Command`, and a per-IDE `AgentAdapter`
(`scripts/acceptance-tests/lib/adapters/{claude,codex,cursor}.ts`,
`opencode` in-flight) owns:

- `buildArgs` — IDE-specific flags (e.g. `claude -p --output-format stream-json
  --permission-mode bypassPermissions`).
- `parseOutput` — IDE-specific `stream-json`/`json` NDJSON dialect parsing.
- `setupMocks` — IDE-specific tool mocking. Claude uses `PreToolUse` Bash-blocking
  hooks written into `settings.local.json`; each IDE differs.
- `getEnv` / `prepareWorkspace` / `calculateUsage` / `cliVersion`.

ACP (Zed's Agent Client Protocol) standardizes client↔agent communication as
**JSON-RPC 2.0 over stdio**: a `Methods`/`Notifications` model with
`initialize`, `session/new`, `session/prompt`, `session/update` (tool-call
reporting), and `session/request_permission` (tool gating). Official client
libraries exist for TypeScript and Rust; agents reach ACP either natively
(Cursor, Gemini, OpenCode) or via a wrapper (`claude-code-acp` over the Claude
Agent SDK; Codex via an ACP server). A standardized client could replace the
N bespoke adapters with one connection + a per-agent launch spec.

External refs: protocol — https://agentclientprotocol.com ; Claude wrapper —
https://github.com/zed-industries/claude-code-acp ; Zed external agents —
https://zed.dev/docs/ai/external-agents .

This task COORDINATES with the in-flight bespoke `OpencodeAdapter`
([opencode-acceptance-adapter](2026/06/opencode-acceptance-adapter.md),
FR-ACCEPT.OPENCODE): full ACP replacement would reach OpenCode through ACP, not a
hand-written adapter — that task is likely **superseded** by this one. Resolve the
overlap before deleting/duplicating adapter code (see Constraints + Follow-ups).

### Current State

- **Spawn + guards** (`spawned_agent.ts`): `Deno.Command` spawn wrapped in
  `python3 setpgrp_exec.py` for a dedicated process group; `process_watchdog.ts`
  (fork-loop + RSS-bloat group-kill) and `system_health.ts` (pre-flight gate)
  defend the host (FR-ACCEPT-GUARDS). Reads stdout (NDJSON) + stderr in parallel.
- **Adapter contract** (`adapters/types.ts`): `AgentAdapter` interface, `ide`
  union `"cursor" | "claude" | "opencode" | "codex"`, `ParsedAgentOutput`.
- **Claude isolation + auth** (`adapters/claude.ts`, FR-ACCEPT-ISOLATION): the
  whole subscription-auth scheme depends on spawning the **exact code-signed
  `claude` binary** with `HOME=<workDir>/bench-home` (empty `.claude/skills/` +
  symlinks to `~/Library/Keychains` and `~/.local/share/claude`) so macOS
  Keychain releases the OAuth token by code-signing identity. Docker isolation was
  abandoned (`9e30ab7`) for breaking exactly this chain. Routing Claude through
  `claude-code-acp` (a Node wrapper) may break it — **OPEN RISK**, spike-gated.
- **Mocks**: static, one-response-per-tool, via IDE hooks (`claude.ts:setupMocks`).
- **Multi-turn**: `--resume <sessionId>` + `UserEmulator` (`runner.ts`,
  `user_emulator.ts`).
- **Cache**: cache-key walks `scripts/acceptance-tests/lib/**`, CLI args, and
  `<cli> --version` (FR-ACCEPT-CACHE). Transport swap changes the key inputs.
- **Consumers** that MUST keep passing unchanged: FR-ACCEPT.RULES
  (`agents-rules-*`), FR-ACCEPT.TRIGGER (skill description-matching), the LLM
  judge, HTML tracing (`trace-*.ts`), usage/cost (`usage.ts`).
- **Tests**: `adapters/*_test.ts`, `spawned_agent_test.ts`, `runner_test.ts`,
  `cache_test.ts`, `integration_test.ts`.

### Constraints

- **Deno-native runtime.** Any ACP library must work under Deno (direct TS lib or
  `npm:` interop). No Node-only build step in the runner path.
- **Preserve FR-ACCEPT-GUARDS.** ACP still spawns a child process → keep
  `setpgrp_exec.py` process-group wrapping + watchdog + health gate. The spawned
  child may now be a wrapper (e.g. `npx claude-code-acp`) whose own children must
  remain inside the killed group.
- **Preserve FR-ACCEPT-ISOLATION intent.** Sandbox `SKILL.md` must be what the
  agent loads — never the user-level `~/.claude/skills/` snapshot. Claude
  subscription auth (Keychain) is a HARD-PREFERENCE: do NOT silently regress it to
  paid API-key auth without the spike's evidence + an explicit user decision.
- **No test-fitting / no behavioral regression** on FR-ACCEPT.RULES,
  FR-ACCEPT.TRIGGER, mocks, multi-turn, usage, tracing.
- **Async error mapping (callback→Promise).** ACP is async JSON-RPC: connection
  drop, malformed frame, agent error response, and watchdog kill MUST each map to
  a deterministic verdict — preserving today's "watchdog trip → `exit_code_zero`
  failure to judge" semantics — not an unhandled rejection. Define the mapping
  explicitly and prove error propagation with a test before deleting stdout-parse.
- **Irreversible-delete gate.** Deleting the direct adapters is the point of no
  return for each IDE. Do NOT delete an IDE's direct path until that IDE runs
  green over ACP (incl. auth, mocks, multi-turn) AND a dual-transport verdict diff
  (run both transports on a sample set, compare judge verdicts) shows no drift.
- **Kill-criterion (crit #2).** If the Phase-0 spike proves `claude-code-acp`
  cannot reuse the signed binary + Keychain AND the user rejects API-key auth for
  Claude, then "full replacement" is unreachable for Claude → STOP and re-scope
  with the user (mixed transport or abort). This is a hard gate, not a Follow-up.
- **Green-gate scenario (crit #1).** The per-IDE green gate MUST use a scenario
  that exercises BOTH a mocked tool call and a `UserEmulator` multi-turn (or two
  scenarios covering each), so the mock interceptor + session reuse are actually
  proven — not a single-turn no-mock scenario.
- **OpenCode sequencing (crit #6) — RESOLVED 2026-06-20.** The bespoke
  `opencode-acceptance-adapter` task is **superseded** by this one (user-confirmed):
  OpenCode is reached via ACP, no hand-written adapter. FR-ACCEPT.OPENCODE is
  absorbed into FR-ACCEPT.ACP; its SRS status change lands when the
  `### FR-ACCEPT.ACP` section is created in develop/commit.

## Definition of Done

Phased. An IDE's direct path is deleted (item 8) ONLY after that IDE is green
over ACP. `<scn>` = an existing pack-level scenario, e.g. `agents-rules-tdd-cycle`.

- [ ] FR-ACCEPT.ACP: SRS gains a `### FR-ACCEPT.ACP` section with `**Desc:**`,
      `**Acceptance:**`, `**Status:**`, and a matching `[ANC:fr:accept.acp]` anchor;
      `index.md` + SRS back-pointers resolve.
  - Test: `scripts/check-salp_test.ts` (anchor/ref resolution)
  - Evidence: `grep -q '### FR-ACCEPT.ACP' documents/requirements.md && deno run -A scripts/check-salp.ts`
- [ ] FR-ACCEPT.ACP (spike): Phase-0 resolves whether `claude-code-acp` reuses the
      code-signed `claude` binary + Keychain, or must fall back to `ANTHROPIC_API_KEY`;
      decision + evidence recorded in this task's Follow-ups before any delete.
  - Test: manual — korchasa (investigative spike)
  - Evidence: one Claude scenario green over ACP — `deno task acceptance-tests -f <scn> --transport acp` — OR a recorded API-key-fallback decision with rationale in `## Follow-ups`
- [ ] FR-ACCEPT.ACP: `AcpClient` drives one prompt turn end-to-end (init →
      `session/new` → `session/prompt` → `session/update` assistant text + tool calls).
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::prompt turn yields assistant text and tool-call updates`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/client_test.ts`
- [ ] FR-ACCEPT.ACP: tool mocking over ACP — a mocked tool is intercepted at
      `session/request_permission` / tool-result, returns the canned reason, real tool
      never executes (replaces Claude `PreToolUse` hooks).
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::mocked tool intercepted, real command not run`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/client_test.ts`
- [ ] FR-ACCEPT.ACP: async error mapping — connection drop / malformed frame /
      agent error response / watchdog kill each map to a deterministic
      `exit_code_zero` failure verdict to the judge (no unhandled rejection).
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::connection drop maps to exit_code_zero failure verdict`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/client_test.ts`
- [ ] FR-ACCEPT.ACP: FR-ACCEPT-GUARDS preserved — the ACP wrapper child tree
      (e.g. `npx claude-code-acp` + its children) stays inside the setpgrp group and
      is killed on fork-loop / RSS-bloat trip.
  - Test: `scripts/acceptance-tests/lib/process_watchdog_test.ts::kills ACP wrapper child tree`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts`
- [ ] FR-ACCEPT-ISOLATION: sandbox `SKILL.md` (not `~/.claude/skills/`) is what the
      agent loads under ACP; `~/.claude/skills/` snapshot byte-identical before/after.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::sandbox skills win and user-level skills dir untouched`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts`
- [ ] FR-ACCEPT.ACP: cache-key covers the ACP transport inputs (agent-spec table,
      ACP lib version, transport flag) so a transport change — INCLUDING the final
      removal of the `--transport` flag / default flip — invalidates stale verdicts.
  - Test: `scripts/acceptance-tests/lib/cache_test.ts::acp transport participates in cache key`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/cache_test.ts`
- [ ] FR-ACCEPT.ACP: per-IDE cutover complete — each supported IDE runs the
      mock+multi-turn green-gate scenario over ACP, a dual-transport verdict diff on a
      sample set shows no drift, THEN its direct `AgentAdapter` + `stream-json`/hook-mock
      code is deleted; FR-ACCEPT.OPENCODE overlap resolved (superseded or absorbed).
  - Test: `manual — korchasa` per-IDE green gate + dual-transport diff + removal assertion
  - Evidence: `deno task acceptance-tests -f <gate-scn> --transport acp` green for each IDE AND `test ! -f scripts/acceptance-tests/lib/adapters/claude.ts` (repeat per removed adapter)
- [ ] FR-ACCEPT.ACP: full check green after migration (fmt, lint, all tests,
      skill validation), with no remaining `stream-json` parse path in the runner.
  - Test: full suite
  - Evidence: `deno task check`

## Solution

**Selected: Variant B** — official ACP TS library (`@zed-industries/agent-client-protocol`
via Deno `npm:`) + a thin migration seam; `SpawnedAgent` keeps spawn + guards;
per-IDE incremental cutover behind green gates; legacy parse/mock code removed last.

### Phase 0 — Spike (auth + transport proof) [blocking gate]

1. Stand up a throwaway `scripts/acceptance-tests/lib/acp/spike.ts`: launch one ACP
   agent as a child (start with an **API-key** agent — Codex via `codex acp`, or
   Gemini — to de-risk transport independently of Claude auth), connect the official
   client over its stdio, run `initialize` → `session/new` → `session/prompt`,
   stream `session/update`, and print assistant text + tool-call updates.
2. Claude auth resolution (the OPEN RISK): launch `npx @zed-industries/claude-code-acp`
   under `HOME=<workDir>/bench-home` with the existing FR-ACCEPT-ISOLATION symlinks.
   Determine empirically whether the Agent-SDK path under the wrapper still reaches
   the code-signed `claude` binary + Keychain (subscription auth survives) or demands
   `ANTHROPIC_API_KEY`. Record the verdict in `## Follow-ups` with evidence (process
   tree, auth outcome). If subscription auth cannot survive → STOP and bring the
   API-key-vs-subscription decision back to the user (do NOT silently regress).
3. Confirm the official TS library imports and runs under Deno (`npm:` specifier,
   any Node-builtin shims). If it does not, fall back to evaluating the community
   AI-SDK ACP provider or Variant A — record which, and STOP for re-confirmation.

### Phase 1 — ACP client + agent registry (parallel transport)

Files to CREATE:

- `scripts/acceptance-tests/lib/acp/client.ts` — `AcpClient` wrapping the official
  library over a child's stdio (provided by `SpawnedAgent`): `initialize`,
  `session/new`, `session/prompt`, `session/update` handler accumulating assistant
  text + tool calls into the existing `ParsedAgentOutput` shape (so the judge,
  tracer, and `UserEmulator` consume an unchanged structure). Implements the
  **client side** of `session/request_permission` for mocking.
- `scripts/acceptance-tests/lib/acp/registry.ts` — declarative `AcpAgentSpec`:
  `{ ide, launch: {command, args, env}, authMode, configDir }`. One row per IDE.
  This is the thin seam that survives migration; it is *data*, not per-IDE logic.
- `scripts/acceptance-tests/lib/acp/stub_agent.ts` (crit #4) — a tiny local
  process that speaks just enough ACP (`initialize`, `session/new`,
  `session/prompt`, scripted `session/update` + `session/request_permission`) to
  drive the client tests offline, deterministically, with no LLM. Explicit build
  step; kept faithful to the real agents' message shapes.
- `scripts/acceptance-tests/lib/acp/client_test.ts`,
  `scripts/acceptance-tests/lib/acp/auth_test.ts` — unit/integration tests driven
  by `stub_agent.ts` (real-implementation, not a mock of our own code).

Files to MODIFY:

- `scripts/acceptance-tests/lib/spawned_agent.ts` — keep `Deno.Command` spawn +
  `setpgrp_exec.py` wrapping + watchdog + health gate. Add a transport branch: when
  `--transport acp`, hand the child's stdio streams to `AcpClient` instead of
  reading `stream-json` stdout. The wrapper child (`npx claude-code-acp`, etc.) and
  its children inherit the PGID → guards unchanged. Add a watchdog test asserting
  the wrapper's child tree is killed.
- `scripts/acceptance-tests/lib/runner.ts` — select transport from CLI/config; on
  `acp`, drive turns via `AcpClient.prompt()`; multi-turn reuses the ACP session
  (no `--resume` reparse). Mock setup routes to the client interceptor, not
  `adapter.setupMocks`.
- `scripts/task-acceptance-tests.ts` + `acceptance_cli.ts` — add `--transport
  acp|direct` (default `direct` during migration; flips to `acp` in Phase 2).
- `scripts/acceptance-tests/lib/cache.ts` — add agent-spec table + ACP lib version
  + transport flag to the cache-key inputs; document in the module docstring.
- `acceptance-tests/config.json` — per-IDE `launch`/`authMode` (or keep models;
  add an `acp` block). Cursor/Codex/Gemini/OpenCode get launch specs.

Mocking design (crit #5): today's static one-response-per-tool contract is
preserved. The interceptor MUST cover BOTH gating paths, because agents differ in
whether they ask before running a tool: (a) `session/request_permission` — answer
deny + canned result for a matched tool; (b) tool-result path — for agents that
auto-run without asking (permission mode off), intercept at the tool-call/result
boundary the lib exposes and substitute the mock so the real tool never executes.
The name/command match reuses the Claude `PreToolUse` Bash-head/discover regex
from `claude.ts:setupMocks`, lifted into the client interceptor — one
implementation for ALL IDEs, replacing per-IDE hooks.

Error handling (callback→Promise mapping, explicit): the ACP connection exposes
async events. Wrap the client in a single `runTurn(): Promise<ParsedAgentOutput>`
that resolves on `session/prompt` completion and **rejects→maps** on: (a) child
process exit before turn completion, (b) malformed/unparseable JSON-RPC frame,
(c) an ACP error response, (d) watchdog kill (SIGTERM/SIGKILL on the group). Each
is caught in the runner and converted to the existing `exit_code_zero`/error
failure verdict handed to the judge — identical to today's watchdog-trip path.
A test injects a mid-turn connection drop and asserts the failure verdict, not an
unhandled rejection.

### Phase 2 — Per-IDE cutover + delete (irreversible, gated)

For each IDE in order **Codex/Gemini (API-key, low-risk) → Cursor → OpenCode →
Claude (last, auth-sensitive)**:

1. Run `<scn>` over `--transport acp`; require green (incl. mocks + multi-turn).
2. Delete that IDE's direct adapter (`adapters/<ide>.ts`) + its `*_test.ts`; drop
   its `stream-json`/hook-mock code paths.
3. Resolve FR-ACCEPT.OPENCODE: mark its task `superseded` by this one (OpenCode now
   reached via ACP) or absorb its DoD here — decide with the user before deleting.

After all IDEs green: flip `--transport` default to `acp`, remove the `direct`
branch + the `AgentAdapter.parseOutput`/`setupMocks` surface (keep only the data
seam in `registry.ts`), delete `setupMocks` hook writers, and update SRS/SDS
(§3.4, §3.4.x) + README + `documents/ides-difference.md` to describe the ACP
transport. This is the convergence to the Variant-C end-state, reached safely.

### Verification

- Unit/integration: `deno test -A scripts/acceptance-tests/lib/acp/`,
  `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts`,
  `deno test -A scripts/acceptance-tests/lib/cache_test.ts`.
- Behavioral (per IDE): `deno task acceptance-tests -f <scn> --transport acp`.
- Full gate: `deno task check` (fmt, lint, all tests, skill validation).
- Regression guard: FR-ACCEPT.RULES + FR-ACCEPT.TRIGGER scenarios green over ACP.

## Follow-ups

- Spike verdict (Phase 0): Claude subscription-auth-over-ACP outcome + evidence —
  to be recorded here before any adapter deletion.
- FR-ACCEPT.OPENCODE coordination: RESOLVED — `opencode-acceptance-adapter` task
  superseded; OpenCode reached via ACP. SRS FR-ACCEPT.OPENCODE → absorbed into
  FR-ACCEPT.ACP at develop/commit (mark the FR `superseded`/absorbed there).
- ACP lib ↔ Deno `npm:` interop notes (Node-builtin shims, if any).
- SDS update (crit #8, deferred to Phase 2): rewrite §3.4 / §3.4.x to describe the
  ACP transport replacing the per-IDE adapter layer; update README +
  `documents/ides-difference.md`. Tracked as a Phase-2 deliverable.
