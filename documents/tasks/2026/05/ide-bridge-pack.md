---
date: 2026-05-17
status: done
implements:
  - FR-AI-IDE-RUNNER
  - FR-IDE-BRIDGE-WORKER
  - FR-IDE-BRIDGE-DELEGATE
tags:
  - pack
  - agent
  - skill
  - cross-ide
  - refactor
related_tasks: []
---

# IDE Bridge Pack — Subagent + Skill Wrapper for Cross-IDE Delegation

## Goal

Let a parent agent in IDE A delegate a multi-step task to IDE B (e.g. Claude → Codex, OpenCode → Claude) without polluting its own context. Today's `flowai-ai-ide-runner` only supports one-shot relay/comparison and lives in the `engineering` pack — co-located with unrelated procedural skills (deep-research, writing, diagrams). Cohesion is wrong and there is no way to offload the cross-IDE conversation into an isolated context window.

## Overview

### Context

`flowai-ai-ide-runner` (FR-AI-IDE-RUNNER) is a courier-style skill: it spawns one or more external CLIs (`claude -p`, `codex exec`, `opencode run`, `cursor-agent -p`) inline from the parent's session and relays stdout verbatim. Every byte of the child runtime's output lands in the parent's context. For one-shot second-opinion / fan-out comparisons that is fine. For "have Codex implement this whole feature for me" it floods the parent.

Variant B (user-selected): create a dedicated `framework/ide-bridge/` pack, move the existing relay skill into it, and add:
1. A subagent `flowai-ide-bridge-worker` whose sole job is to own the cross-IDE invocation in its own isolated context.
2. A skill wrapper `flowai-delegate-to-ide` that the parent triggers on delegation queries; the skill instructs the parent to call the worker via the Agent/Task tool rather than running the child CLI inline.

The existing relay skill stays in scope but moves home (path-only refactor, no semantic change). Its 7 acceptance scenarios travel with it.

### Current State

- `framework/engineering/skills/flowai-ai-ide-runner/` with SKILL.md, references/, and 7 acceptance-test scenarios (4 execution + 3 trigger).
- `FR-AI-IDE-RUNNER` SRS clause documents the courier contract and scope path `framework/engineering/skills/flowai-ai-ide-runner/`.
- `documents/design.md` §3.14 mirrors the same path.
- `README.md` Packs section lists the skill under `engineering`.
- No `ide-bridge` pack. No worker agent. No delegate-skill wrapper.

### Constraints

- **No new behaviour for FR-AI-IDE-RUNNER**: the move is path-only. Existing 7 scenarios must still pass after the move with zero scenario edits beyond what `scripts/check-trigger-coverage.ts` and the scenario auto-discovery (`AcceptanceTestScenario.targetAgentPath`) handle automatically.
- **Worker inherits verbatim-relay rule**: the subagent is a courier too — it MUST NOT synthesise an answer from its own weights when relaying the child CLI's output back to the parent. Same hook-blocked-call semantics apply.
- **Skill wrapper MUST delegate via Agent/Task tool, NOT inline Bash**: if it shells out itself, the context-isolation rationale collapses. Acceptance must verify the skill spawns the worker (or, equivalent in the host IDE, an isolated-context subagent).
- **No inter-pack reference**: `ide-bridge` is self-contained. No imports from `engineering` or `core` (enforced by `scripts/check-pack-refs.ts`).
- **Trigger disambiguation `flowai-ai-ide-runner` vs `flowai-delegate-to-ide`**:
  - `flowai-ai-ide-runner` keeps its existing trigger surface: "compare X vs Y", "try on <model>", "run in <ide> as second opinion", "fan-out across IDEs".
  - `flowai-delegate-to-ide` triggers on: "delegate <task> to <ide>", "have <ide> do <task>", "execute <task> in <ide>", "offload to <ide>".
  - Acceptance: each skill's `trigger-adj-1` points at the other.
- **No multi-turn / session-resume in v1**: the worker does single-shot delegation (one prompt → one CLI call → one relay back). Multi-turn delegation via `codex resume` / `claude --resume` is a future enhancement, not part of this task.
- **`-beta` lifecycle does NOT apply**: new primitives ship as stable directly. No A/B against an existing primitive (the delegate-skill is new, not a redesign of `flowai-ai-ide-runner`).

## Definition of Done

- [x] FR-AI-IDE-RUNNER: skill moved to `framework/ide-bridge/skills/flowai-ai-ide-runner/` with all 7 acceptance-test scenarios; old path is gone; SRS + SDS + README references updated.
  - Test: 7 existing scenarios (4 execution + 3 trigger) discoverable under the new path (auto-discovery via `targetAgentPath` scans `framework/<pack>/{skills,commands}/`).
  - Evidence: `test -f framework/ide-bridge/skills/flowai-ai-ide-runner/SKILL.md && ! test -e framework/engineering/skills/flowai-ai-ide-runner && deno run -A scripts/check-trigger-coverage.ts && deno run -A scripts/check-pack-refs.ts` exits 0 ✅.
- [x] FR-IDE-BRIDGE-WORKER: subagent `framework/ide-bridge/agents/flowai-ide-bridge-worker.md` exists with canonical frontmatter (`mode: subagent`, `tools: Bash`, `model: smart`, `maxTurns: 12`) and body specifying single-shot delegation + verbatim-relay contract.
  - Benchmark: covered end-to-end by `flowai-delegate-to-ide-via-subagent` (the wrapping scenario is the only honest test path: `AcceptanceTestAgentScenario` does not actually execute a subagent's body in isolation — the main runtime sees the userQuery directly, so a standalone worker scenario tests the wrong thing). Pattern mirrors `flowai-deep-research-worker`, which has no standalone acceptance scenarios either.
  - Evidence: `deno task acceptance-tests -f flowai-delegate-to-ide-via-subagent` exits 0 with `worker_subagent_invoked` and `mock_content_relayed` both green — proves the worker was dispatched, ran `codex` once, and relayed the distinctive mock phrase verbatim through the subagent → parent path.
- [x] FR-IDE-BRIDGE-DELEGATE: skill `framework/ide-bridge/skills/flowai-delegate-to-ide/SKILL.md` exists; body instructs the parent to invoke the `flowai-ide-bridge-worker` subagent via Agent/Task tool and forbids inline child-CLI Bash calls; description distinguishes the skill from `flowai-ai-ide-runner` along the relay-vs-delegate axis.
  - Benchmark: `flowai-delegate-to-ide-via-subagent` (execution) + `flowai-delegate-to-ide-trigger-pos-1` / `-trigger-adj-1` (points at `flowai-ai-ide-runner` relay) / `-trigger-false-1`.
  - Evidence: `deno task acceptance-tests -f flowai-delegate-to-ide` ran all 4 scenarios — 4 PASSED ✅; `deno run -A scripts/check-trigger-coverage.ts` exits 0 ✅.
- [x] New pack manifest exists: `framework/ide-bridge/pack.yaml` with `name: ide-bridge`, `version`, `description`. No `scaffolds:` block (none needed in v1).
  - Test: `deno run -A scripts/check-pack-refs.ts` parses the new pack.
  - Evidence: `test -f framework/ide-bridge/pack.yaml && deno run -A scripts/check-pack-refs.ts` exits 0 ✅.
- [x] SRS + SDS + README sync:
  - `documents/requirements.md`: FR-AI-IDE-RUNNER scope path updated; new FR-IDE-BRIDGE-WORKER and FR-IDE-BRIDGE-DELEGATE sections with `**Description:**`, `**Scope:**`, `**Constraints:**`, `**Acceptance verified by acceptance tests:**` + `**Tasks:**` back-pointer to this task.
  - `documents/design.md`: §3.14 path update; new §3.17 "IDE Bridge Pack" describing the subagent + delegate-skill split.
  - `README.md`: `### engineering` block loses `flowai-ai-ide-runner` line; new `### ide-bridge` block added.
  - `documents/index.md`: rows for FR-AI-IDE-RUNNER, FR-IDE-BRIDGE-WORKER, FR-IDE-BRIDGE-DELEGATE under `## FR`.
  - Evidence: `deno task check` exits 0 (covers `check-srs-evidence`, `check-traceability`, `check-task-format`, `check-pack-refs`, `check-trigger-coverage`, fmt, lint, tests).

## Solution

Execution order matters — the path move must happen with its acceptance tests intact before any new primitives are added, so each step has a clean checkpoint.

### Step 1 — Create pack skeleton

1. `mkdir -p framework/ide-bridge/{skills,agents}`.
2. Write `framework/ide-bridge/pack.yaml`:
   ```yaml
   name: ide-bridge
   version: "0.1.0"
   description: Cross-IDE delegation. One-shot relay and context-isolated subagent for running CLIs of other AI IDEs (claude / codex / opencode / cursor-agent).
   ```
3. Verify: `deno run -A scripts/check-pack-refs.ts` exits 0 (parses, no inter-pack errors).

### Step 2 — Move `flowai-ai-ide-runner` skill (RED → GREEN identity move)

Path-only move; the acceptance scenarios are the regression net.

1. `git mv framework/engineering/skills/flowai-ai-ide-runner framework/ide-bridge/skills/flowai-ai-ide-runner` (preserves history for the SKILL.md, references/, and all 7 acceptance-test scenarios). Move is path-only — do NOT edit any line inside the moved files.
2. Re-run one existing scenario to prove the runner finds the skill at the new path (smoke-test the auto-discovery before believing the full sweep):
   ```
   deno task acceptance-tests -f flowai-ai-ide-runner-trigger-pos-1
   ```
   Expect: pass. `targetAgentPath` (`scripts/acceptance-tests/lib/types.ts`) already iterates packs, so no infra change is needed.
3. Verify check passes: `deno run -A scripts/check-trigger-coverage.ts` exits 0; `deno run -A scripts/check-skills.ts` exits 0.

### Step 3 — Add `flowai-ide-bridge-worker` subagent (RED → GREEN)

RED: write the agent benchmark first, watch it fail because the agent file does not exist.

1. Create benchmark scenario directory:
   - `framework/ide-bridge/agents/flowai-ide-bridge-worker/acceptance-tests/delegate-to-codex/mod.ts`
   - Subclass `AcceptanceTestAgentScenario` (field `agent: "flowai-ide-bridge-worker"`).
   - `userQuery`: a delegation prompt naming Codex as the target ("Have Codex tell me one rule of thumb for writing maintainable TypeScript and quote its answer verbatim.").
   - `mocks: { codex: "[benchmock-cx9p] CODEX-MOCK: prefer immutability and reject any-typed inputs." }`.
   - Checklist (all critical except the last):
     - `codex_binary_invoked` — agent shells out to `codex` (`codex exec` or stdin form), not to claude/opencode/cursor-agent.
     - `non_interactive_flag` — uses `exec` subcommand (one-shot mode).
     - `mock_content_relayed_verbatim` — final message contains the literal `[benchmock-cx9p]` token; agent did NOT paraphrase or synthesise from its weights.
     - `no_extra_synthesis` — agent's own commentary, if any, is clearly outside the quoted block; the substantive answer comes from the mock string.
     - `single_shot` (non-critical) — agent did not spawn additional `codex` calls; one invocation is enough for this prompt.
2. Run it: `deno task acceptance-tests -f flowai-ide-bridge-worker-delegate-to-codex`. Expect failure (agent file missing → adapter cannot locate the agent).
3. GREEN: write `framework/ide-bridge/agents/flowai-ide-bridge-worker.md`:
   - Frontmatter (canonical superset, modelled on `flowai-deep-research-worker.md`):
     ```yaml
     ---
     name: flowai-ide-bridge-worker
     description: Cross-IDE delegation worker. Receives a task description + target IDE (codex / claude / opencode / cursor-agent), spawns the target's non-interactive CLI once, relays its stdout/stderr verbatim back to the parent. Single-shot. Spawned by `flowai-delegate-to-ide` — do NOT invoke directly for one-shot relay (use `flowai-ai-ide-runner` instead).
     tools: Bash
     disallowedTools: Write, Edit, Read
     readonly: true
     mode: subagent
     model: smart
     effort: medium
     maxTurns: 12
     opencode_tools:
       write: false
       edit: false
     ---
     ```
   - Body sections:
     - Inputs (parsed from task prompt): `{target_ide}`, `{model}` (optional, default to the IDE's flagship alias), `{task_prompt}`.
     - Workflow:
       1. Pick binary by `{target_ide}` (`codex` → `codex exec`; `claude` → `CLAUDECODE="" claude -p`; `opencode` → `opencode run -m <provider/model>`; `cursor-agent` → `cursor-agent -p --trust`).
       2. Resolve model — prefer caller-supplied; otherwise the IDE's default alias.
       3. Run once via `Bash`. Redirect both streams (`> /tmp/<ide>.out 2>&1` only if needed for length).
       4. Quote stdout byte-for-byte in a labelled block (`<IDE> — <model>:`).
       5. On hook-blocked sandbox calls, treat the `reason` payload as the child's stdout (verbatim relay rule from FR-AI-IDE-RUNNER applies).
     - Output contract (verbatim relay): copy the contract from `flowai-ai-ide-runner` SKILL.md but tightened to a single CLI call.
     - Scope boundaries: does NOT compare runs, fan out, install CLIs, run authentication flows, or persist transcripts.
4. Re-run the benchmark; iterate until it passes.

### Step 4 — Add `flowai-delegate-to-ide` skill wrapper (RED → GREEN)

RED first.

1. Create benchmark scenarios:
   - `framework/ide-bridge/skills/flowai-delegate-to-ide/acceptance-tests/via-subagent/mod.ts`
     - Subclass `AcceptanceTestScenario` (field `skill: "flowai-delegate-to-ide"`).
     - `userQuery`: "Delegate this task to Codex: write me one TS rule of thumb and quote it verbatim."
     - `mocks: { codex: "[benchmock-dl4r] CODEX-MOCK: prefer pure functions for testable cores." }`.
     - Checklist (critical):
       - `worker_subagent_invoked` — trace shows the parent called the Agent/Task tool with `subagent_type` (or IDE equivalent) of `flowai-ide-bridge-worker`. If the parent IDE has no Agent tool, the skill's text MUST nonetheless instruct invocation of the worker, and the parent at minimum reads the worker's `.md` file (visible in trace).
       - `no_inline_codex_in_parent` — there is NO direct `Bash("codex …")` call in the parent's own tool trace (only inside the worker's child trace, which is fine).
       - `mock_content_relayed` — final answer contains `[benchmock-dl4r]`.
   - `framework/ide-bridge/skills/flowai-delegate-to-ide/acceptance-tests/trigger-pos-1/mod.ts` — `userQuery`: "Have Codex implement a small TS helper for me and show me its answer." Checklist: `skill_invoked` (critical).
   - `framework/ide-bridge/skills/flowai-delegate-to-ide/acceptance-tests/trigger-adj-1/mod.ts` — adjacent skill IS `flowai-ai-ide-runner` (relay/comparison). `userQuery`: "Run this prompt in OpenCode and Claude in parallel and compare the answers." Checklist: `skill_not_invoked` (critical) — for THIS query the relay skill is the right fit, not the delegate wrapper.
   - `framework/ide-bridge/skills/flowai-delegate-to-ide/acceptance-tests/trigger-false-1/mod.ts` — false-use: in-domain wording but wrong intent. `userQuery`: "Update my Codex config to use the `gpt-5` model by default." (settings-tweak, not delegation). Checklist: `skill_not_invoked`.
2. Run: `deno task acceptance-tests -f flowai-delegate-to-ide`. All four scenarios should fail (skill file missing).
3. GREEN: write `framework/ide-bridge/skills/flowai-delegate-to-ide/SKILL.md`:
   - Frontmatter:
     ```yaml
     ---
     name: flowai-delegate-to-ide
     description: Delegate a task to another AI IDE's CLI (codex / claude / opencode / cursor-agent) through an isolated-context subagent. Use when the user says "delegate to <ide>", "have <ide> do <task>", "execute <task> in <ide>", "offload to <ide>". For one-shot relay or side-by-side comparison across IDEs use `flowai-ai-ide-runner` instead — this skill spawns the `flowai-ide-bridge-worker` subagent so the child CLI's transcript does not flood the parent context.
     ---
     ```
   - Body:
     - Workflow:
       1. Parse the user's intent: `{target_ide}`, optional `{model}`, `{task_prompt}`.
       2. Invoke the `flowai-ide-bridge-worker` subagent. Per-host invocation syntax:
          - **Claude Code:** `Agent` / `Task` tool with `subagent_type=flowai-ide-bridge-worker`.
          - **OpenCode:** `@flowai-ide-bridge-worker <task prompt>` mention syntax.
          - **Cursor / Codex (no native subagent dispatch):** subagent invocation is unavailable — surface this clearly to the user and route them to `flowai-ai-ide-runner` for one-shot relay. The skill does NOT silently fall back to running the child CLI inline (that would defeat context isolation; the user must opt into the relay path).
          Pass `{target_ide} / {model} / {task_prompt}` in the task prompt.
       3. Relay the worker's reply to the user as-is. Do NOT add commentary inside the worker's quoted block.
     - Scope boundaries (negative): NEVER run the target CLI inline from the parent — that defeats the context-isolation point. If the host IDE has no subagent mechanism, surface that limit and direct the user to `flowai-ai-ide-runner` for one-shot relay.
     - Trigger discrimination block ("When to use this skill vs `flowai-ai-ide-runner`"): two-bullet contrast — delegation-with-isolation vs one-shot-relay/comparison.
4. Re-run all 4 scenarios; iterate until they pass.

### Step 5 — Update documentation (SRS / SDS / README / index)

1. `documents/requirements.md`:
   - FR-AI-IDE-RUNNER: change `**Scope:**` path from `framework/engineering/skills/flowai-ai-ide-runner/` to `framework/ide-bridge/skills/flowai-ai-ide-runner/`. Add `**Tasks:**` back-pointer line right after `**Description:**`.
   - Insert new FR sections after FR-AI-IDE-RUNNER (so they sit together):
     - `### FR-IDE-BRIDGE-WORKER: Cross-IDE Delegation Subagent — flowai-ide-bridge-worker` with `**Description:**`, `**Tasks:**`, `**Scope:**`, `**Constraints:**` (verbatim relay, single-shot, no auth), `**Acceptance verified by acceptance tests:** flowai-ide-bridge-worker-delegate-to-codex`, `**Status:** [x]` after evidence runs.
     - `### FR-IDE-BRIDGE-DELEGATE: Cross-IDE Delegation Skill Wrapper — flowai-delegate-to-ide` with same shape; `**Acceptance verified by acceptance tests:** flowai-delegate-to-ide-via-subagent, flowai-delegate-to-ide-trigger-pos-1, flowai-delegate-to-ide-trigger-adj-1, flowai-delegate-to-ide-trigger-false-1`.
2. `documents/design.md`:
   - §3.14: path → `framework/ide-bridge/skills/flowai-ai-ide-runner/SKILL.md`. Add cross-link to §3.17.
   - Add §3.17 "IDE Bridge Pack — `ide-bridge`" describing the three primitives, the relay-vs-delegate split, and the subagent's verbatim-relay inheritance from FR-AI-IDE-RUNNER.
   - §3.1.1 Packs list: add `ide-bridge`.
3. `README.md`:
   - Remove the `- flowai-ai-ide-runner — …` line from `### engineering` block.
   - Insert a new `### ide-bridge` block (between `### engineering` and `### devtools`, alphabetical not strictly enforced) listing:
     - `**Skills:** flowai-ai-ide-runner …; flowai-delegate-to-ide …`
     - `**Agents:** flowai-ide-bridge-worker …`
4. `documents/index.md` `## FR` section: insert sorted rows for FR-AI-IDE-RUNNER, FR-IDE-BRIDGE-DELEGATE, FR-IDE-BRIDGE-WORKER. Placeholder `-tbd` anchors (used in the plan-step index-update) MUST be replaced with the real GFM auto-slugs at the moment the corresponding SRS sections are written here — otherwise `scripts/check-traceability.ts` flags broken links.

### Step 6 — Full check

1. `deno task check` — must exit 0.
2. Hand-off note for user (only after all scenarios in steps 3–4 pass locally): run full sweep `deno task acceptance-tests -f flowai-ai-ide-runner` and `deno task acceptance-tests -f flowai-ide-bridge` to confirm cross-scenario regressions are clean. Per AGENTS.md "Acceptance Test TDD / CHECK" rule, the agent runs only the new/changed scenarios; the full sweep is the user's call.

## Follow-ups

- Multi-turn / session-resume in the worker (e.g. `codex resume <session-id>`) for tasks that need iterative refinement. Add a `--resume` flag handling block + a separate execution scenario. Out of scope here.
- Optional `flowai-delegate-to-ide` integration with `flowai-ai-ide-runner` for hybrid flows ("delegate to Codex AND ask Claude to grade Codex's answer") — defer until the basic single-delegate case is validated in real use.
- Smoke-test the hook-mock layer through a subagent's Bash call (parent → worker → mocked `codex`). If the mock framework does not intercept the child's Bash from inside an Agent-tool-spawned context, the worker's execution scenario will fail with no mock content reaching the agent — surface as a scenario-infrastructure issue before iterating on the agent prompt.
