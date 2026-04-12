# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and Commands project.
- **Scope:** A collection of skills, agents, and commands to standardize and enhance development workflows in AI-first IDEs (Cursor, Claude Code, OpenCode).
- **Audience:** Developers and AI agents working in supported AI IDEs.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).
  - **SPOT:** Single Point of Truth.

## 2. General description

- **System context:** A set of configuration files (`.md`, SKILL.md) stored in `framework/` (product) and `.claude/` (dev resources). Distributed to end users via flowai. Interpreted by AI agents in supported IDEs.
- **Assumptions and constraints:**
  - **Assumptions:** Developer uses Claude Code. macOS/Linux environment. flowai installed for framework resource sync.
  - **Constraints:** Agent's context window limits apply. Hook/plugin systems differ per IDE (Cursor hooks, Claude Code hooks with 17+ events, OpenCode plugins) — format transformation needed.

## 3. Functional requirements

### Implementation Order (open requirements)

Dependencies between unclosed requirements define execution order:

1. **FR-PACKS** Pack System — restructure framework, update flowai CLI
2. **FR-HOOK-RESOURCES** Hook Resources — depends on FR-PACKS (pack structure)
3. **FR-SCRIPTS** Script Resources — depends on FR-PACKS (pack structure)
4. **FR-UNIVERSAL** Universal Skill & Script Requirements — standardize before distribution
5. **FR-INIT.RERUN** flowai-init idempotent re-run — independent, can run in parallel with 4
6. **FR-BENCH.COLOC** Co-locate benchmarks with skills — can run in parallel with 4–5

```
FR-PACKS (pack system) → FR-HOOK-RESOURCES (hooks), FR-SCRIPTS (scripts) — parallel after FR-PACKS
FR-UNIVERSAL (parallel with above)
FR-INIT.RERUN (parallel)
FR-BENCH.COLOC (parallel)
FR-DIST.MAPPING open questions (parallel)
```

Note: FR-DIST.MAPPING defines cross-IDE resource mapping; open questions need user decisions before command sync implementation.

### FR-CMD-EXEC: Command Execution

- **Description:** The system must provide executable workflows for common development tasks, accessible via chat commands (`/<command>`).
- **Acceptance verified by benchmarks:** See Component Coverage Matrix (section 3.8) — all commands benchmarked.

### FR-RULES: Rule Enforcement

- **Description:** The system must automatically apply development rules and coding standards (code style, TDD, documentation).
- **Acceptance verified by benchmarks:** `flowai-setup-agent-code-style-ts-deno-basic`, `flowai-setup-agent-code-style-ts-strict-basic`

### FR-DOCS: Documentation Management

- **Description:** The system must define and enforce documentation schemas (SRS/SDS) to maintain project knowledge.
- **Acceptance:** Enforced by `AGENTS.md` documentation rules section.

### FR-HOWTO: Automation & How-To

- **Description:** The system must provide guides (`flowai-skill-*`) for complex or situational tasks (QA, testing, diagrams, prompts, research, etc.).
- **Acceptance verified by benchmarks:** See Component Coverage Matrix (section 3.8) — all skills benchmarked.

### FR-MAINT: Project Maintenance

- **Description:** The system must provide automated project maintenance via `deno task check` (linting, testing, validation).
- **Acceptance:**
  - [x] Deno tasks configured in `deno.json`.
  - [x] Task scripts in `./scripts/`.

### FR-ONBOARD: Developer Onboarding & Workflow Clarity

- **Description:** The project's `README.md` must provide clear, actionable instructions for developers on when and how to use the available tools.
- **Use case scenario:** A new developer joins the project and reads the `README.md` to understand the workflow for starting the project, implementing a task, and performing periodic maintenance.
- **Acceptance criteria:**
  - [x] Instructions for project initialization and environment verification.
  - [x] Step-by-step workflow for task implementation (Plan -> Execute -> Verify -> Commit).
  - [x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent Updates).
  - [x] Guidance for specific cases (Investigate, Answer, Engineer).

### FR-BENCH: Benchmarking

- **Description:** Evidence-based benchmarking system to evaluate agent skill execution quality. `deno task bench`.
- **Key capabilities:** Isolated sandbox execution (`SpawnedAgent`), LLM-based Judge, evidence collection, interactive flows (`UserEmulator`), cost/token tracking, HTML tracing, parallel execution protection.
- **Architecture:** Co-located scenarios (`framework/<pack>/skills/<skill>/benchmarks/` and `framework/<pack>/commands/<command>/benchmarks/`), pack-level scenarios (`framework/<pack>/benchmarks/`), pack-scoped sandbox, Claude CLI judge (`cliChatCompletion`), mandatory `agentsTemplateVars` (compile-time enforced).
- **Implementation:** `scripts/benchmarks/lib/` (runner, judge, spawned_agent, user_emulator, trace, types, utils).

### FR-BENCH.RULES: AGENTS.md Rules Benchmarks

- **Description:** Pack-level benchmarks (`framework/core/benchmarks/agents-rules-*/`) that verify agents follow AGENTS.md template rules on a real project fixture (ai-skel-ts). Template stored at `framework/core/assets/AGENTS.template.md`.
- **Acceptance verified by benchmarks:**
  - [x] `agents-rules-tdd-cycle` — TDD RED→GREEN→REFACTOR→CHECK
  - [x] `agents-rules-fail-fast` — no stubs, fix source not test, stop on missing config
  - [x] `agents-rules-stop-analysis` — 5-WHY, STOP on unfixable problem
  - [x] `agents-rules-contradictions` — contradiction detection, ask and stop
  - [x] `agents-rules-functionality-preservation` — run tests before/after refactoring
  - [x] `agents-rules-evidence-claims` — read code before fixing, cite evidence
- **Open (not yet implemented):**
  - [ ] `agents-rules-variant-analysis` — propose variants with pros/cons before coding
  - [ ] `agents-rules-proactive-resolution` — find answers in codebase, don't ask user
  - [ ] `agents-rules-no-silent-fallbacks` — don't add defaults/fallbacks without asking
  - [ ] `agents-rules-run-all-tests` — run full test suite, not just changed files

### FR-EXP: Experiments Subsystem (RELOCATED)

- **Status:** Relocated to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11 (provenance SHA `f311142`). Requirement retained here as a stub so historical traceability links keep resolving.
- **Description:** Parameterized empirical studies of AI agent platforms (model × IDE × memory layout × workload). Distinct from regression benchmarks (which stay in this repo). Results are committed numeric evidence, not pass/fail tests.
- **Rationale for split:** Experiments had zero runtime overlap with the framework product, inflated the `flow` clone with ever-growing committed results, and required live Claude CLI + macOS keychain auth that this repo's CI cannot provide.
- **Scope in `flow`:** This repo no longer contains experiment code, the `deno task experiment` entry point, or the `writeMemoryFile` / `getCleanroomEnv` / `MemoryScope` adapter extensions. The `AgentAdapter` contract returns to benchmark-only responsibilities.

### FR-EXP.MEMORY-LENGTH: AGENTS.md/CLAUDE.md Max Length Experiment (RELOCATED)

- **Status:** Relocated to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11 along with all `claude-md-length` variants and committed results. See `flowai-experiments:scripts/experiments/claude-md-length/README.md` for methodology, first-run headline numbers, and rerun instructions.

### FR-COMPONENT: Component Coverage

All 41 skills have at least one benchmark scenario. Coverage is the source of truth: `find framework -name "mod.ts" -path "*/benchmarks/*" | wc -l`. Agents (4 canonical definitions) are not benchmarked individually — they are exercised as subagents within skill benchmarks.

### FR-INIT: Project Initialization

- **Description:** The `flowai-init` skill bootstraps AI agent understanding of a project by analyzing codebase, generating a single AGENTS.md file from the pack-level asset template, and scaffolding documentation (CLAUDE.md, SRS, SDS). Uses `generate_agents.ts` (Deno/TS, read-only) for project analysis. The AGENTS.md template is a pack-level asset (not a flowai-init scaffold) — its updates are tracked independently via `assets:` in `pack.yaml`. Legacy three-file layouts (`documents/AGENTS.md`, `scripts/AGENTS.md`) are detected and collapsed into the single root file during brownfield initialization.
- **Use case scenario:** User runs `/flowai-init` on existing or new project. Agent runs the analysis script, determines Greenfield vs Brownfield by its own judgment, interviews user (Greenfield) or reverse-engineers architecture (Brownfield), generates AGENTS.md, documentation (SRS, SDS, task file), and configures development commands.
- **Acceptance verified by benchmarks:** `flowai-init-greenfield`, `flowai-init-brownfield`, `flowai-init-brownfield-update`, `flowai-init-brownfield-idempotent`, `flowai-init-vision-integration`, `flowai-init-claude-md-symlinks`
- **Infrastructure acceptance (code/scripts):**
  - [x] **FR-INIT.STACK Stack detection**: `generate_agents.ts` detects 6 stacks via marker files.
  - [x] **FR-INIT.TESTS Unit tests**: `generate_agents.test.ts` covers 8 scenarios.

### FR-DEV-SYNC: Multi-IDE Dev Resource Distribution

- **Description:** Dev resources (skills, agents, scripts) in `.claude/` are generated by `deno task sync-local` from `framework/` directly. NOT tracked in git. Auto-synced via SessionStart (bootstrap) and SessionEnd (persist changes) hooks.
- **Use case scenario:** Developer clones project. SessionStart hook detects empty `.claude/skills/` and runs `deno task sync-local` to populate from `framework/`. Changes to `framework/` are re-synced on each SessionEnd.
- **Acceptance criteria:**
  - [x] `.claude/skills/`, `.claude/agents/`, `.claude/scripts/` gitignored.
  - [x] SessionStart hook bootstraps `.claude/` if empty.
  - [x] SessionEnd hook re-syncs `.claude/` from `framework/` after each session.
  - [x] `deno task sync-local` uses `LocalSource` (reads `framework/` on disk).
  - [x] `check-skills.ts` validates `.claude/skills/` (dev skills).

### FR-DIST: Global Framework Distribution — flowai

- **Description:** `flowai` CLI tool (`cli/` monorepo directory, published to JSR as `@korchasa/flowai`) syncs framework skills/agents into project-local IDE config dirs. Single command, no subcommands. Reads bundled framework data (no network dependency at runtime).
- **Def/Abbr:** CLI = flowai, BundledSource = JSON artifact with all framework files baked at publish time.

#### FR-DIST.SYNC Sync Command (`flowai`)
- **Desc:** Single command `flowai` run in project dir. Reads bundled framework, syncs skills/agents to IDE config dirs.
- **Scenario A (no config, interactive):** `flowai` without `.flowai.yaml` → interactive prompts (IDEs, packs) → generates `.flowai.yaml` → syncs.
- **Scenario A2 (no config, non-interactive):** `flowai -y` without `.flowai.yaml` → auto-detect IDEs, select all packs → generates `.flowai.yaml` with defaults → syncs.
- **Scenario B (with config):** `flowai` with `.flowai.yaml` → disclaimer → sync. Bundled files compared with local. Unchanged silently, locally modified → prompt.
- **Acceptance:**
  - [x] Without `.flowai.yaml` → interactive config generation → sync.
  - [x] With `.flowai.yaml` → disclaimer → sync.
  - [x] Files read from `BundledSource` (bundled.json).
  - [x] Skills written to `{ide_dir}/skills/{name}/`.
  - [x] Agents transformed per-IDE via `transformAgent()`.
  - [x] Idempotent: safe on repeated runs.
  - [x] `--yes` / `-y` flag for non-interactive mode.
  - [x] `-y` without config → non-interactive config generation (auto-detect IDEs, all packs).
  - [x] Core-level assets (`framework/<pack>/assets/`) synced to `{ide_dir}/assets/`. Asset changes reported as `ASSETS UPDATED` in sync output with mapped project artifact paths (from `pack.yaml` `assets:` field).

#### FR-DIST.CONFIG Config Generation
- **Desc:** Interactive `.flowai.yaml` creation when config missing.
- **Acceptance:**
  - [x] Prompts: IDEs (auto-detected), skills include/exclude, agents include/exclude.
  - [x] Reads available skills/agents from BundledSource.
  - [x] Writes valid `.flowai.yaml`.

#### FR-DIST.FILTER Selective Sync
- **Desc:** `.flowai.yaml` controls which skills/agents to sync.
- **Acceptance:**
  - [x] Include/exclude filters for skills and agents.
  - [x] Include + exclude mutually exclusive.

#### FR-DIST.SYMLINKS CLAUDE.md Symlinks
- **Desc:** When `claude` IDE configured, create `CLAUDE.md -> AGENTS.md` symlink at project root.
- **Acceptance:**
  - [x] Scans project, creates/updates symlinks.
  - [x] Skips existing regular files.

#### FR-DIST.DETECT IDE Auto-Detection
- **Desc:** Detect IDEs by config dir presence (`.cursor/`, `.claude/`, `.opencode/`, `.codex/`).
- **Acceptance:**
  - [x] Detects 4 IDEs (Cursor, Claude Code, OpenCode, OpenAI Codex).
  - [x] Used as default when `ides` not in `.flowai.yaml`.
  - [x] `isInsideIDE()` recognises `CURSOR_AGENT`, `CLAUDECODE`, `OPENCODE`, plus `CODEX_THREAD_ID` / `CODEX_SANDBOX` (Codex sets these in every `codex exec` session).

#### FR-DIST.UPDATE Self-Update Check
- **Desc:** Before sync, checks JSR for newer version. Fail-open (network errors ignored).
- **Acceptance:**
  - [x] Fetches JSR meta, compares semver.
  - [x] `--skip-update-check` flag.
  - [x] 5s timeout, fail-open.

#### FR-DIST.UPDATE-CMD Self-Update Subcommand
- **Desc:** `flowai update` subcommand checks JSR for a newer version and installs it automatically. Shared update logic used by both `flowai update` and `flowai sync` pre-flight check.
- **Acceptance:**
  - [x] `flowai update` subcommand registered in CLI.
  - [x] Prints "Already up to date" when current version is latest.
  - [x] Prints "Updated to X.Y.Z" and returns on successful install.
  - [x] Graceful message on network error, exits 0.
  - [x] `yes` mode: prints update command instead of prompting.
  - [x] `runSelfUpdate()` shared by `flowai update` and `flowai sync`.

#### FR-DIST.BUNDLE Bundled Source
- **Desc:** Framework files bundled into `cli/src/bundled.json` at publish time. No network dependency during sync.
- **Acceptance:**
  - [x] `scripts/bundle-framework.ts` generates bundle from `../framework/`.
  - [x] `BundledSource` reads bundle.
  - [x] Guard: `task-check.ts` runs bundle before tests.

#### FR-DIST.USER-SYNC Cross-IDE User Resource Sync

- **Desc:** When `user_sync: true` in `.flowai.yaml` and ≥2 IDEs configured, propagate user-created resources (non-`flowai-*`, non-framework) across IDE config dirs. Canonical source = newest mtime.
- **Acceptance:**
  - [x] Scans skills/agents in each IDE dir, skips `flowai-*` prefix.
  - [x] Skips framework-bundled resources by name (e.g., `flowai-deep-research-worker`).
  - [x] Merges by `(type, name)` across IDEs, picks canonical by newest mtime.
  - [x] Agent frontmatter transformed per IDE via `crossTransformAgent()`.
  - [x] Invalid YAML frontmatter: copies as-is with warning (no crash).
  - [x] Skills copied as-is (no frontmatter transform).
  - [x] Conflict prompt in interactive mode; `--yes` overwrites.
  - [x] Skipped when <2 IDEs.
  - [x] Idempotent: repeated runs produce 0 writes.

#### FR-DIST.MIGRATE One-Way IDE Migration

- **Desc:** `flowai migrate <from> <to>` migrates all primitives (skills, agents, commands) from one IDE config dir to another in a single pass. Includes both framework (`flowai-*`) and user-created resources. Agent frontmatter transformed for target IDE. Rules and hooks excluded (format incompatible).
- **Acceptance:**
  - [x] `flowai migrate <from> <to>` subcommand available.
  - [x] Skills copied as-is (full dir tree).
  - [x] Agents transformed via `crossTransformAgent()` for target IDE.
  - [x] Commands copied as-is.
  - [x] No filter: both `flowai-*` and user resources migrated.
  - [x] Conflict prompt in interactive mode; `--yes` overwrites.
  - [x] `--dry-run`: prints plan, no files written.
  - [x] Unknown IDE → error before FS operations.
  - [x] Same from/to → error.

#### FR-DIST.MAPPING Cross-IDE Resource Mapping (universal representation)

- **Desc:** Defines how each logical resource type maps to IDE-specific paths and formats. flowai uses these mappings during framework sync (FR-DIST.SYNC) and user sync (FR-DIST.USER-SYNC).

**Resource type mapping:**

| Logical type | Cursor | Claude Code | OpenCode | OpenAI Codex |
|:---|:---|:---|:---|:---|
| **Command** (user-invoked only) | `.cursor/commands/foo.md` — flat md, no frontmatter | `.claude/commands/foo.md` — flat md, optional frontmatter (`allowed-tools`, `model`) | `.opencode/commands/foo.md` — flat md, `$ARGUMENTS` + shell interpolation | Installed as skill-command in `.codex/skills/foo/SKILL.md` with `disable-model-invocation: true` (Codex has no dedicated commands dir) |
| **Skill** (model-invocable) | `.cursor/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.claude/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.opencode/skills/foo/SKILL.md` — dir, same format | `.codex/skills/foo/SKILL.md` — dir, same format (Codex also auto-discovers `.agents/skills/` as fallback) |
| **Skill-command** (user-invoked skill) | `.cursor/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.claude/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.opencode/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.codex/skills/foo/SKILL.md` with `disable-model-invocation: true` |
| **Agent** | `.cursor/agents/foo.md` — frontmatter: `name`, `description`, `readonly`, `model` | `.claude/agents/foo.md` — frontmatter: `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color` | `.opencode/agents/foo.md` — frontmatter: `description`, `mode`, `model`, `color`, `steps`, `tools` (map) | `.codex/agents/foo.toml` (sidecar) with `name`/`description`/`developer_instructions` + registered in `.codex/config.toml` as `[agents.foo] description=... config_file="./agents/foo.toml"` |

**Agent frontmatter field mapping (universal → IDE):**

| Universal field | Cursor | Claude Code | OpenCode | OpenAI Codex |
|:---|:---|:---|:---|:---|
| `name` | kept | kept | dropped | kept (sidecar `name`) |
| `description` | kept | kept | kept | kept (TOML `description` in both config + sidecar) |
| `tools` (string) | dropped | kept | dropped | dropped |
| `disallowedTools` | dropped | kept | dropped | dropped |
| `readonly` | kept | dropped | dropped | dropped |
| `mode` | dropped | dropped | kept | dropped |
| `opencode_tools` (map) | dropped | dropped | renamed → `tools` | dropped |
| `model` (tier) | resolved to IDE-native | resolved to IDE-native | resolved from .flowai.yaml or omitted | dropped (Codex subagents inherit the session model) |
| `effort` | dropped | kept | dropped | dropped |
| `maxTurns` | dropped | kept | renamed → `steps` | dropped |
| `background` | dropped | kept | dropped | dropped |
| `isolation` | dropped | kept | dropped | dropped |
| `color` | dropped | kept | kept | dropped |
| agent body (markdown) | stored as file body | stored as file body | stored as file body | stored in sidecar as `developer_instructions = """..."""` (TOML multi-line string, escaped) |
| unknown fields | pass-through | pass-through | pass-through | dropped (Codex TOML has a fixed schema) |

**Skill frontmatter fields (universal, no IDE transform):**

| Field | Claude Code | Cursor | OpenCode | Purpose |
|:---|:---|:---|:---|:---|
| `name` | yes | yes | yes | Skill identifier |
| `description` | yes | yes | yes | Skill purpose |
| `disable-model-invocation` | yes | yes | yes | User-invoked only |
| `allowed-tools` | yes | — | — | Pre-approve tools |
| `model` | yes (tier → resolved) | — | yes (tier → resolved) | Override model (tier: max/smart/fast/cheap/inherit) |
| `effort` | yes | — | — | Reasoning effort level |
| `argument-hint` | yes | — | — | Argument placeholder |

**Cross-IDE sync transformations (user_sync):**

| Source → Target | Resource type | Transform |
|:---|:---|:---|
| Skill (any IDE pair) | skill | Copy dir as-is (format identical across IDEs) |
| Skill with extra files (references/, scripts/) | skill | Copy entire dir tree |
| Agent (cursor → claude) | agent | Frontmatter: keep `name`+`description`+`tools`+`disallowedTools`+`model`+`effort`+`maxTurns`+`background`+`isolation`+`color`, drop `readonly` |
| Agent (claude → cursor) | agent | Frontmatter: keep `name`+`description`+`readonly`+`model`, drop `tools`+`disallowedTools`+`effort`+`maxTurns`+`background`+`isolation`+`color` |
| Agent (any → opencode) | agent | Frontmatter: keep `description`+`mode`+`model`+`color`, rename `opencode_tools`→`tools` + `maxTurns`→`steps`, drop rest |
| Agent (invalid YAML) | agent | Copy as-is, log warning |
| Command (cursor → claude) | command | Copy `.cursor/commands/foo.md` → `.claude/commands/foo.md` as-is |
| Command (cursor → opencode) | command | Copy `.cursor/commands/foo.md` → `.opencode/commands/foo.md` as-is |

**Not synced (by design):**

- Framework resources (`flowai-*` prefix or matching bundled names) — managed by framework sync (FR-DIST.SYNC)
- Rules (`.cursor/rules/` ↔ `.claude/rules/`) — frontmatter differs fundamentally (globs vs paths), no automated transform
- Hooks (`.cursor/hooks.json` ↔ `.claude/settings.json` hooks key) — structure and event names differ, no automated transform
- MCP config (`mcp.json` ↔ `.mcp.json`) — trivial rename, user responsibility

**Open questions:**

- [ ] Should `user_sync` also propagate `.cursor/commands/` ↔ `.claude/commands/` ↔ `.opencode/commands/`?
- [ ] Should skills with `disable-model-invocation: true` in one IDE map to commands in another?

- **Acceptance:**
  - [x] Agent transform implemented per mapping table above.
  - [x] Skill copy preserves dir structure with extra files.
  - [x] Framework resources excluded from user sync.
  - [ ] Command sync across IDEs (pending open question resolution)

#### FR-DIST.CODEX-AGENTS OpenAI Codex Subagent Sync

- **Desc:** Sync universal agent files (`framework/<pack>/agents/*.md`) to OpenAI Codex subagent format. Codex uses TOML configuration (`~/.codex/config.toml` or `<repo>/.codex/config.toml`) with `[agents.<name>]` tables that reference sidecar agent files via `config_file`. Agent prompt body lives in `<repo>/.codex/agents/<name>.toml` as `developer_instructions` (TOML multi-line string). Flowai owns only `[agents.<name>]` tables listed in `.codex/flowai-agents.json` manifest; user-authored tables are preserved.
- **Scenario:** `flowai sync` with `ides: [codex]` and a set of universal agents writes each agent body to `.codex/agents/<name>.toml` (with `name`/`description`/`developer_instructions`) and merges `[agents.<name>]` entries into `.codex/config.toml` via `mergeCodexConfig`. Removing an agent from the sync set removes its table and sidecar on next run. Malformed TOML in `.codex/config.toml` throws a clear error naming the file path — does NOT silently overwrite user config.
- **Acceptance:**
  - [x] `mergeCodexConfig(tomlText, changes, manifest)` is pure (no FS) and only mutates `[agents.<name>]` tables listed in the manifest.
  - [x] `writeCodexAgents(plan, fs, cwd)` in `cli/src/writer.ts` writes sidecars + TOML block + manifest atomically.
  - [x] Running `sync` twice is idempotent for Codex (no diff on second run). Evidence: `cli/src/sync_test.ts` Codex idempotency case.
  - [x] Removing an agent from `.flowai.yaml` removes the `[agents.<name>]` block and `.codex/agents/<name>.toml` on next sync.
  - [x] User-hand-edited `[agents.user-agent]` tables survive a sync round-trip.
  - [x] Malformed `.codex/config.toml` throws with file path + underlying parse error; file contents are preserved.
  - [x] Manifest file `.codex/flowai-agents.json` tracks managed agent names (mirrors `flowai-hooks.json`).

#### FR-DIST.CODEX-HOOKS OpenAI Codex Hook Sync (Experimental)

- **Desc:** Sync universal `hook.yaml` definitions to OpenAI Codex `hooks.json` format (`~/.codex/hooks.json` or `<repo>/.codex/hooks.json`). Codex uses Claude-Code-compatible event names (`PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`) and a nested `hooks` structure very similar to Claude. The Codex hook subsystem is feature-gated behind `codex_hooks` (stage: under development) and the flowai sync path is gated behind `experimental.codexHooks: true` in `.flowai.yaml`. When the flag is absent or false, hook sync for Codex is skipped with an info log. This requirement is experimental — tests are tagged `@flaky-until-probed` until a live probe against enabled `codex_hooks` confirms the schema.
- **Scenario:** With `experimental.codexHooks: true`, `flowai sync` transforms each hook definition via `transformHookForCodex` and calls `mergeCodexHooks` to produce a `hooks.json` with the Claude-style nested shape (`{ "hooks": { "PreToolUse": [{ matcher, hooks: [{ type: "command", command, timeout }] }] } }`). User-added hooks outside the flowai manifest are preserved. Removing a hook from the flowai set removes only its manifest-tracked entries.
- **Acceptance:**
  - [ ] `transformHookForCodex(hook, scriptPath)` produces an entry matching the Codex wire schema captured from the binary (`PreToolUse`/`PostToolUse`/`SessionStart`/`UserPromptSubmit`, `matcher`, nested `hooks[]` with `type`/`command`/`timeout`). Tagged `@flaky-until-probed`.
  - [ ] `mergeCodexHooks(existing, newHooks, manifest)` preserves user hooks not tracked by the manifest.
  - [x] `sync` skips Codex hook install when `experimental.codexHooks` is absent or false; info-logs the skip reason.
  - [x] `sync` installs hooks into `<cwd>/.codex/hooks.json` when flag is true.
  - [x] `cleanupRemovedHooks` removes only manifest-tracked entries for Codex.

#### FR-SOURCE-OVERRIDE: Source Override (git branch / local path)

- **Desc:** `.flowai.yaml` `source` field overrides default BundledSource. Supports git branch/tag clone and local filesystem path. Default git URL: official repo (`https://github.com/korchasa/flowai.git`).
- **Config:**
  - `source.ref` — branch or tag (clones via `git clone --depth 1 --branch`). Default URL if `source.git` absent.
  - `source.git` — custom repo URL (requires `source.ref`). For forks.
  - `source.path` — local `framework/` dir path. Mutually exclusive with `source.ref`.
  - No `source` field → bundled (backward compatible).
- **Acceptance:**
  - [x] `source.ref` alone → clone default repo. Evidence: `cli/src/source.ts:95-96`, `cli/src/source_test.ts:306-319`
  - [x] `source.git` + `source.ref` → clone custom repo. Evidence: `cli/src/source.ts:95`, `cli/src/source_test.ts:321-332`
  - [x] `source.path` → LocalSource. Evidence: `cli/src/sync.ts:64-65`
  - [x] `source.git` without `ref` → validation error. Evidence: `cli/src/config.ts:97-100`, `cli/src/config_test.ts:424-434`
  - [x] `source.ref` + `source.path` → validation error. Evidence: `cli/src/config.ts:101-104`, `cli/src/config_test.ts:436-446`
  - [x] No `source` → BundledSource (backward compatible). Evidence: `cli/src/sync.ts:66-68`, `cli/src/config_test.ts:419-421`
  - [x] CLI logs source type. Evidence: `cli/src/cli.ts:101-110`
  - [x] Cleanup on failure (tmpdir removed). Evidence: `cli/src/source.ts:115-116`
  - [x] `deno task check` passes with all new tests. Evidence: 255 tests pass.

### FR-AGENT-COMMIT: Conventional Commits — `agent` Type

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention used by `flowai-commit`. Covers changes to agents, skills, `AGENTS.md`, and other AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent definition. On commit, the message is prefixed with `agent:` (e.g., `agent: update flowai-commit skill with atomic grouping rules`).
- **Acceptance verified by benchmarks:** `flowai-commit-agent-type`

### FR-REVIEW-COMMIT: Review-and-Commit Workflow — `flowai-review-and-commit`

- **Description:** Composite command: review → gate (Approve only) → commit. Stops on Request Changes/Needs Discussion.
- **Acceptance verified by benchmarks:** `flowai-review-and-commit-approve`, `flowai-review-and-commit-reject`, `flowai-review-and-commit-auto-docs`, `flowai-review-and-commit-suggest-reflect`, `flowai-review-and-commit-parallel-delegation`, `flowai-review-and-commit-non-deno-project`

### FR-DEVCONTAINER: AI Devcontainer Setup — flowai-skill-setup-ai-ide-devcontainer

- **Description:** Generates `.devcontainer/` config optimized for AI IDE development. Stack detection, AI CLI integration, global skills mounting, security hardening.
- **Acceptance verified by benchmarks:** `flowai-skill-setup-ai-ide-devcontainer-node-basic`, `flowai-skill-setup-ai-ide-devcontainer-deno-with-claude`, `flowai-skill-setup-ai-ide-devcontainer-deno-flowai`, `flowai-skill-setup-ai-ide-devcontainer-brownfield-existing`, `flowai-skill-setup-ai-ide-devcontainer-feature-discovery`, `flowai-skill-setup-ai-ide-devcontainer-opencode-multi-cli`

### FR-UNIVERSAL: Universal Skill & Script Requirements

- **Description:** All framework skills MUST conform to the agentskills.io standard and work identically across supported IDEs (Cursor, Claude Code, OpenCode). Scripts bundled with skills MUST be cross-IDE compatible.
- **Use case scenario:** A developer installs flowai skills via flowai. Skills with bundled scripts work in any of the three supported IDEs without modification.
- **Priority:** High (foundational for multi-IDE support).

#### FR-UNIVERSAL.STRUCT Directory Structure (agentskills.io)

- **Acceptance:**
  - [x] Every skill is a directory with `SKILL.md` (required) and optional `scripts/`, `references/`, `assets/`, `evals/` subdirectories. No other top-level conventions (README.md, CHANGELOG.md). Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.FRONTMATTER Frontmatter (agentskills.io)

- **Acceptance:**
  - [x] `name` (required, max 64 chars, `[a-z0-9-]`, must match parent directory name) and `description` (required, max 1024 chars). Optional: `license`, `compatibility`, `metadata`, `allowed-tools` (experimental), `disable-model-invocation`. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.DISCLOSURE Progressive Disclosure (agentskills.io)

- **Acceptance:**
  - [x] Metadata (~100 tokens) loaded at startup; full SKILL.md (<5000 tokens, <500 lines) on activation; scripts/references/assets loaded only when required. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.REFS File References (agentskills.io)

- **Acceptance:**
  - [x] One level deep from SKILL.md. No nested reference chains. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.XIDE-PATHS Cross-IDE Script Path Resolution

- **Acceptance:**
  - [x] **Relative paths**: SKILL.md MUST reference scripts using relative paths from the skill root (e.g., `scripts/validate.ts`, `python3 scripts/process.py`). Per agentskills.io client implementation guide, the IDE resolves relative paths against the skill's directory and converts to absolute paths in tool calls. All framework SKILL.md files migrated to relative paths.
  - [x] **No custom path placeholders**: Do NOT use custom placeholders like `<this-skill-dir>` in framework skills. The agentskills.io standard defines relative paths as the canonical mechanism; IDEs are responsible for resolution. Existing skills using `<this-skill-dir>` MUST be migrated to plain relative paths. Enforced by `scripts/check-skills.ts`.
  - [x] **No IDE-specific path variables**: Do NOT use `${CLAUDE_SKILL_DIR}` or other IDE-specific variables in framework skills. These are IDE extensions, not part of the agentskills.io standard, and break portability. Enforced by `scripts/check-skills.ts`.

#### FR-UNIVERSAL.IDE-NEUTRAL Framework IDE Neutrality

- **Desc:** Framework SKILL.md bodies and command bodies MUST NOT name a specific IDE model ID or CLI binary. Model resolution happens at install time via `DEFAULT_MODEL_MAPS` and `resolveModelTier`; hard-coding `gpt-5.x`, `claude-opus-x`, or `claude-sonnet-x` breaks cross-IDE portability and drifts out of sync when IDE model catalogs change. Abstract tiers (`max`/`smart`/`fast`/`cheap`/`inherit`) are the only portable way to express intent.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` validates `framework/<pack>/{skills,commands}/**/SKILL.md` bodies against forbidden patterns: `gpt-5(?:\.\d+)?(?:-\w+)?`, `claude-opus-\d(?:-\d+)?`, `claude-sonnet-\d(?:-\d+)?`. Violations fail the check with criterion tag `FR-UNIVERSAL.IDE-NEUTRAL`.
  - [x] Frontmatter `model:` keys with abstract tiers (e.g. `model: smart`) are allowed; only the body is scanned.
  - [x] Benchmarks directory (`framework/*/benchmarks/`) and `.claude/skills/` dev resources are exempt (not distributed).

**Script Requirements**

- **Acceptance criteria:**
  - [x] **Non-interactive**: Scripts MUST NOT use interactive prompts (stdin confirmation, interactive menus). All input via CLI flags, env vars, or stdin piping. Agents run in non-interactive shells. All 17 scripts use CLI args/env/stdin piping; none use interactive prompts.
  - [x] **Structured output**: Scripts MUST output structured data (JSON preferred) to stdout. Diagnostics/progress to stderr. This enables reliable parsing by any agent implementation. All framework scripts output `{ "ok": bool, "result": {...} }` JSON to stdout. Diagnostics go to stderr via `console.error()`.
  - [x] **Self-contained dependencies**: Scripts MUST declare dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for Deno/TS). No implicit global installs required. All framework scripts use `jsr:` specifiers. No bare `@std/` imports remain in `framework/<pack>/{skills,commands}/*/scripts/`.
  - [N/A] **Help output**: Scripts SHOULD implement `--help` flag as the primary way agents learn the script interface. Dropped: agents read SKILL.md for script interface; `--help` duplicates SKILL.md and adds maintenance burden.
  - [x] **Meaningful exit codes**: Exit 0 on success, non-zero on failure. Scripts SHOULD use distinct codes for different error types. All 17 scripts exit 0/non-zero correctly. Verified across `scripts/`, `framework/<pack>/skills/*/scripts/`, and `framework/<pack>/commands/*/scripts/`.
  - [x] **Read-only by default**: Analysis/validation scripts MUST NOT create, write, or modify project files. File creation is the agent's responsibility unless the script's explicit purpose is generation. Analysis scripts (`generate_agents.ts`, `check-skills.ts`, `check-agents.ts`) are read-only.
  - [x] **Idempotent**: Scripts MUST be safe to run multiple times with the same input producing the same output. Validation/check scripts are inherently idempotent (read-only). Init scripts support `--skip-existing` flag for idempotent mode; default is fail-fast on conflict.
  - [x] **Error messages**: Scripts MUST provide clear, actionable error messages to stderr. Include what failed, why, and how to fix. All 17 scripts write diagnostics to stderr via `console.error()`.
  - [x] **Dry-run support**: Scripts performing destructive operations SHOULD support `--dry-run` flag. N/A — no framework scripts perform destructive operations. All are analysis/validation/symlink tools.

**Script Language Policy**

- **Acceptance criteria:**
  - [x] **Framework scripts in Deno/TS**: All framework product scripts (`framework/<pack>/{skills,commands}/*/scripts/`) MUST be written in Deno/TypeScript. Zero `.py` files in these subtrees.
  - [x] **General-purpose utilities in Python**: Utility scripts outside the framework product directory MAY use Python. Scripts inside `framework/<pack>/{skills,commands}/*/scripts/` MUST be Deno/TS per FR-UNIVERSAL.LANG. Policy documented in SDS (section 3.1.2 "Script Language Policy"). Project uses Deno/TS exclusively — no Python.
  - [x] **User-facing skills are language-agnostic**: The agentskills.io standard allows any language. Framework documentation (e.g., `flowai-skill-engineer-skill`) MUST NOT restrict users to a single language. Common options: Python, Bash, JavaScript/TypeScript. `flowai-skill-engineer-skill` does not restrict script language; examples mention multiple options.

#### FR-UNIVERSAL.EXEC Script Execution Model

- **Acceptance criteria:**
  - [x] **Agent-driven execution**: Scripts are NOT auto-executed. The agent reads SKILL.md instructions and decides when to run scripts using its standard code execution tool (Bash/terminal). This is consistent across all three IDEs. All SKILL.md files use imperative instructions ("Run…", "Execute…") directing the agent; no auto-execution hooks.
  - [x] **No dedicated script runner**: There is no special "script runner" tool in any supported IDE. All script execution goes through the generic Bash/terminal tool. Confirmed: all three IDEs (Cursor, Claude Code, OpenCode) use Bash/terminal for script execution.
  - [x] **allowed-tools hint**: Skills MAY use the `allowed-tools` frontmatter field (experimental) to pre-approve tools needed for script execution (e.g., `Bash(deno:*)`). This reduces permission prompts but is not guaranteed across all IDEs. Documented in SDS (section 3.1.3 "Skill Tool Hints"). Adoption is optional per agentskills.io spec.

#### FR-UNIVERSAL.DISCOVERY Skill Discovery Paths

- **Acceptance criteria:**
  - [x] **Framework distribution**: Framework primitives distributed from `framework/<pack>/skills/` and `framework/<pack>/commands/` to IDE directories via flowai. Both subtrees install into `.{ide}/skills/`; commands get `disable-model-invocation: true` injected by the writer at sync time. See FR-DIST, FR-PACKS.STRUCT.
  - [x] **Cross-IDE discovery**: Skills discoverable by IDEs via IDE-specific config dirs (e.g., `.claude/skills/`). flowai handles placement per IDE.
  - [x] **Name collision**: Project-level skills override user-level skills when names collide (per agentskills.io client implementation guide). flowai overwrites on sync. Documented in SDS (section 3.1.4).

### FR-UPDATE: Framework Update — `flowai-update`

- **Description:** Single entry point for updating the flowai framework. Handles CLI update, skill/agent sync via `flowai sync`, migration of the AGENTS.md asset artifact (from the pack-level template), and migration of scaffolded project artifacts using template diffs as migration source. Detects legacy three-file AGENTS.md layouts and collapses them into a single root file.
- **Acceptance verified by benchmarks:** `flowai-update-basic`, `flowai-update-skill-adaptation`, `flowai-update-sync-command`, `flowai-update-template-vs-artifact`

### FR-ADAPT: Standalone Primitive Adaptation — `flowai-adapt`

- **Description:** On-demand adaptation of all installed framework primitives (skills, agents, AGENTS.md artifact, hooks) to project specifics — independent of the update cycle. Uses `flowai-skill-adapter` subagent for skills and `flowai-agent-adapter` subagent for agents. Supports filtering by type (`--skills`, `--agents`, `--assets`, `--hooks`) and by name.
- **Use case scenario:** Developer installs flowai on a Python project. All skills contain generic Deno examples. Runs `/flowai-adapt` to adapt all primitives to Python/pytest/ruff. Can also run `/flowai-adapt --skills flowai-commit` to adapt a single skill.
- **Acceptance verified by benchmarks:** `flowai-adapt-skills-basic`, `flowai-adapt-agents-basic`

#### FR-ADAPT.SKILLS Skill Adaptation

- **Desc:** Scans `{ide}/skills/` for `flowai-*` directories, launches `flowai-skill-adapter` subagent per skill in parallel, shows diff, asks confirmation.
- **Acceptance:**
  - [ ] Scans installed skills in IDE config dirs.
  - [ ] Launches parallel `flowai-skill-adapter` subagents.
  - [ ] Shows diff per skill, asks user confirmation.
  - [ ] Reverts rejected adaptations.

#### FR-ADAPT.AGENTS Agent Adaptation

- **Desc:** Scans `{ide}/agents/` for `flowai-*` files, launches `flowai-agent-adapter` subagent per agent in parallel, shows diff, asks confirmation. Frontmatter preserved as-is.
- **Acceptance:**
  - [ ] Scans installed agents in IDE config dirs.
  - [ ] Launches parallel `flowai-agent-adapter` subagents.
  - [ ] Shows diff per agent, asks user confirmation.
  - [ ] Frontmatter unchanged after adaptation.

#### FR-ADAPT.ASSETS AGENTS.md Artifact Verification

- **Desc:** Compares pack-level templates (`{ide}/assets/`) with project artifacts (AGENTS.md), proposes updates for outdated framework sections.
- **Acceptance:**
  - [ ] Reads asset mapping from `pack.yaml` or uses default mapping.
  - [ ] Compares template vs artifact using `git diff --no-index`.
  - [ ] Proposes updates for outdated framework-originated sections.

#### FR-ADAPT.HOOKS Hook Adaptation

- **Desc:** Checks hook scripts in `{ide}/scripts/` for stack-specific commands, adapts if needed.
- **Acceptance:**
  - [ ] Scans hook scripts for stack-specific commands.
  - [ ] Skips stack-agnostic hooks.
  - [ ] Adapts stack-specific hooks with project commands.

### FR-PACKS: Pack System — Modular Resource Installation

- **Description:** Reorganize framework resources into self-contained packs. Each pack is an autonomous directory containing commands, skills, agents, hooks, and scripts. Users select packs in `.flowai.yaml` instead of listing individual resource names. Replaces flat `framework/skills/` and `framework/agents/` structure.
- **Use case scenario:** Developer runs `flowai sync` with `.flowai.yaml` containing `packs: [core, deno]`. Only resources from those packs are installed. Another developer with `packs: []` gets only core pack.
- **Priority:** High (enables scalable resource management, unblocks hooks/scripts).
- **Terminology:** "Command" has two meanings — (a) a user-only framework primitive under `framework/<pack>/commands/`, distributed into `.{ide}/skills/` with `disable-model-invocation: true` injected by the writer; (b) an IDE-native slash-command file under `.{ide}/commands/` owned by the user and managed by `flowai user-sync`. The CLI's `PlanItemType = "command"` refers only to (b).

#### FR-PACKS.STRUCT Pack Structure

- **Desc:** Each pack is a directory under `framework/<name>/` containing `pack.yaml` manifest and resource subdirectories (`commands/`, `skills/`, `agents/`, `hooks/`, `scripts/`). `commands/` holds user-only primitives (names `flowai-*`, `flowai-setup-*`); `skills/` holds agent-invocable primitives (names `flowai-skill-*`). Resources discovered by convention (directory scan), not listed in manifest.
- **Acceptance:**
  - [x] `pack.yaml` format: `name` (string), `version` (semver), `description` (string).
  - [x] Skills stored as `framework/<pack>/skills/<name>/SKILL.md`.
  - [x] Commands stored as `framework/<pack>/commands/<name>/SKILL.md`.
  - [x] Agents stored as `framework/<pack>/agents/<name>/SUBAGENT.md`.
  - [x] No dependencies between packs — each pack is self-contained.
  - [x] `framework/skills/` and `framework/agents/` removed. All resources live in packs.

#### FR-PACKS.CMD-INVARIANT Command source MUST NOT carry `disable-model-invocation`

- **Desc:** SKILL.md files under `framework/<pack>/commands/` are the source of truth for user-only primitives. They MUST NOT declare `disable-model-invocation` in their frontmatter. The CLI writer (`injectDisableModelInvocation` in `cli/src/sync.ts`) injects `disable-model-invocation: true` at sync time based on directory placement. Directory is the single source of truth for the user-only classification.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` rejects any `framework/<pack>/commands/*/SKILL.md` that carries `disable-model-invocation` in source. Verified by `check-skills_test.ts::validateKindInvariants: command WITH flag fails`.
  - [x] CLI reader `readPackCommandFiles` injects the flag into the in-memory copy returned to the writer. Verified by `sync_test.ts::readPackCommandFiles - injects disable-model-invocation into SKILL.md`.
  - [x] End-to-end sync test `main_test.ts::sync - pack commands install into .{ide}/skills/ with injected flag` asserts the installed SKILL.md contains the flag.

#### FR-PACKS.SKILL-INVARIANT Skill source MUST NOT carry `disable-model-invocation`

- **Desc:** SKILL.md files under `framework/<pack>/skills/` are agent-invocable by definition. They MUST NOT declare `disable-model-invocation` at all. A primitive that is user-only belongs under `commands/`, not `skills/`.
- **Acceptance:**
  - [x] `scripts/check-skills.ts` rejects any `framework/<pack>/skills/*/SKILL.md` that carries `disable-model-invocation` in source. Verified by `check-skills_test.ts::validateKindInvariants: skill WITH flag fails`.

#### FR-PACKS.CONFIG Config v1.1

- **Desc:** `.flowai.yaml` version `"1.1"` adds `packs:` field. `skills.include/exclude` applies after pack expansion.
- **Acceptance:**
  - [x] `packs:` field: list of pack names to install.
  - [x] `packs: []` (empty) = install only `core` pack.
  - [x] `packs` absent + `version: "1.0"` = all resources (backward compat).
  - [x] `skills.exclude`/`skills.include` applied AFTER pack expansion.
  - [x] v1 config auto-migrated to v1.1 on `flowai sync` (adds all packs).

#### FR-PACKS.VERSION Pack Versioning

- **Desc:** `flowai sync` displays version changes informionally. No pinning — always installs latest from bundle.
- **Acceptance:**
  - [x] `flowai sync` output shows pack versions.

#### FR-PACKS.BUNDLE Bundle Update

- **Desc:** `cli/scripts/bundle-framework.ts` scans the full `framework/*/` tree (pack-aware, path-agnostic walk). Bundles commands, skills, agents, hooks, scripts, and assets from every pack.
- **Acceptance:**
  - [x] Bundle includes pack definitions and all pack resources.
  - [x] Existing tests updated for new bundle structure.
  - [x] Bundle walks `framework/<pack>/commands/` and `framework/<pack>/skills/` without hardcoded subtree enumeration.

#### FR-PACKS.DEFAULTS Default Packs

- **Desc:** `flowai init` (interactive config generation) defaults to all packs.
- **Acceptance:**
  - [x] Generated `.flowai.yaml` includes all available packs.

### FR-HOOK-RESOURCES: Hook Resources

- **Description:** Packs contain hooks — Deno TS scripts triggered by IDE events (PostToolUse, PreToolUse). Hooks are IDE-agnostic: stored as `hook.yaml` + `run.ts`, installed by flowai with IDE-specific configuration generation. Claude Code naming as canonical; flowai transforms for other IDEs.
- **Use case scenario:** Pack `core` contains `flowai-skill-structure-validate` hook. `flowai sync` for Claude Code adds entry to `settings.json` hooks section; for Cursor — generates `.cursor/hooks.json`; for OpenCode — generates plugin file.
- **Priority:** Medium (new resource type, depends on FR-PACKS).

#### FR-HOOK-RESOURCES.FORMAT Hook Format

- **Desc:** Hook = directory with `hook.yaml` (metadata) + `run.ts` (Deno script). Located at `framework/<pack>/hooks/<name>/`.
- **Acceptance:**
  - [x] `hook.yaml` fields: `event`, `matcher` (optional), `description`, `timeout` (optional, default 30/600).
  - [x] Supported events: PostToolUse, PreToolUse, SessionStart. Event/tool name mapping per IDE.
  - [x] `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. SessionStart hooks output `hookSpecificOutput.additionalContext`.
  - [x] 2 framework hooks: `flowai-skill-structure-validate` (devtools), `flowai-mermaid-validate` (engineering).

#### FR-HOOK-RESOURCES.INSTALL IDE-Specific Installation

- **Desc:** flowai reads `hook.yaml` and generates IDE-specific configuration. Manifest tracks installed hooks for clean deinstallation.
- **Acceptance:**
  - [x] Claude Code: 3-level nested entry in `settings.json` hooks section.
  - [x] Cursor: flat entry in `.cursor/hooks.json`.
  - [x] OpenCode: generated plugin file `.opencode/plugins/flowai-hooks.ts`.
  - [x] Manifest `.{ide}/flowai-hooks.json` tracks installed hooks. Removed hooks cleaned from IDE config.
  - [x] Merge preserves user hooks (not in manifest).

#### FR-HOOK-RESOURCES.SYNC-INFRA Hook Sync Infrastructure

- **Desc:** flowai discovers, reads, copies hook files, generates IDE config, and tracks actions in SyncResult.
- **Acceptance:**
  - [x] Hook discovery: `extractPackHookNames()` extracts hooks from `framework/<pack>/hooks/`.
  - [x] Hook files copied to `.{ide}/scripts/` during sync.
  - [x] `resolvePackResources()` includes `hookNames` in return.
  - [x] `SyncResult.hookActions` tracks per-hook actions.

### FR-SCRIPTS: Script Resources

- **Description:** Packs can contain scripts — utility shell/Deno scripts callable by skills via bash. Not tied to IDE events. Copied to `.{ide}/scripts/` at install time.
- **Priority:** Low (simple copy, depends on FR-PACKS).
- **Acceptance:**
  - [x] **FR-SCRIPTS.STORE** Scripts stored at `framework/<pack>/scripts/<name>`.
  - [x] **FR-SCRIPTS.COPY** Copied to `.{ide}/scripts/` during sync.

### FR-REFLECT: Reflection with Session History Search and Self-Criticism

- **Description:** Reflection skills (`flowai-reflect`, `flowai-reflect-by-history`) must search session history for similar errors/mistakes, identify patterns, and include findings in output. Before presenting the final report, the agent must perform self-criticism — validate findings, check for false positives and blind spots, evaluate proportionality of proposed fixes, and revise the report accordingly.
- **Acceptance verified by benchmarks:** `flowai-reflect-session-history-pattern`, `flowai-reflect-context-inefficiency`, `flowai-reflect-process-loop`, `flowai-reflect-self-criticism`, `flowai-reflect-by-history-self-criticism`

### FR-CICD: CI/CD Pipeline Security

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-CICD.PIN SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment.
  - [ ] **FR-CICD.PRIV Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [ ] **FR-CICD.INTEGRITY File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [ ] **FR-CICD.JOBS Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.

### FR-WB-CLEANUP: Task File Cleanup on Commit

- **Description:** `flowai-commit` deletes referenced task file after commit when all Definition of Done items are satisfied. If DoD is partially complete, asks user. Prevents stale task files from accumulating.
- **Acceptance verified by benchmarks:** `flowai-commit-task-cleanup`, `flowai-commit-task-cleanup-partial`

### FR-REVIEW-SPLIT: Responsibility Separation: Review vs Commit

- **Description:** Clear separation of concerns between `flowai-review` and `flowai-commit`:
  - Review owns: project checks (lint/test), hygiene scan, code quality verdict
  - Commit owns: documentation audit, atomic grouping, commit execution, task file cleanup
  - Review MUST NOT do atomic commit grouping (SA3). Commit MUST NOT run project checks.
- **Acceptance verified by benchmarks:** `flowai-commit-no-checks`, `flowai-review-no-grouping`

### FR-LOOP: Non-Interactive Runner — `flowai loop`

- **Description:** Launch Claude Code non-interactively with a prompt. Base automation primitive. `flowai loop [OPTIONS] <prompt>`.
- **Acceptance:**
  - [x] CLI subcommand `loop` with flags: `--agent`, `--model`, `--cwd`, `--yolo`, `--timeout`, `--interval`, `--max-iterations`.
  - [x] Stream-json output processing with ANSI formatting and agent nesting depth tracking.
  - [x] 28 unit tests for pure functions, formatter, processNDJSONStream.

## 4. Non-functional requirements


- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based verification. Execution must be protected by timeouts (e.g., 60s per step) to ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/flowai-commit`). Benchmark reports must be human-readable and provide actionable feedback via `trace.md`.

## 5. Interfaces

- **APIs and integrations:**
  - AI IDE Chat (Cursor, Claude Code, OpenCode): Primary interface for user-agent interaction.
  - File System: Storage for rules, commands, and documentation. Symlinks for multi-IDE distribution.
  - Git: Version control operations.
  - MCP: Integration with external tools (GitHub, etc.).
- **Protocols and data formats:** Markdown (`.md`, SKILL.md, RULE.md).
- **UI/UX constraints:** Text-based chat interface.

## 6. Acceptance criteria

- The system is considered accepted if the following are met:
  - All defined commands are executable by agents in supported IDEs.
  - Rules are correctly loaded and applied by agents.
  - Dev resources in `.claude/` are accessible to Claude Code.
  - Framework resources installable via flowai (`flowai sync`).
  - Documentation accurately reflects the project state.
