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
- **Acceptance:** Enforced by `documents/AGENTS.md` rules.

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
- **Architecture:** Co-located scenarios (`framework/<pack>/skills/<skill>/benchmarks/`), pack-scoped sandbox, Claude CLI judge (`cliChatCompletion`), mandatory `agentsTemplateVars` (compile-time enforced).
- **Implementation:** `scripts/benchmarks/lib/` (runner, judge, spawned_agent, user_emulator, trace, types, utils).

### FR-COMPONENT: Component Coverage

All 38 skills have at least one benchmark scenario. Coverage is the source of truth: `find framework -name "mod.ts" -path "*/benchmarks/*" | wc -l`. Agents (4 canonical definitions) are not benchmarked individually — they are exercised as subagents within skill benchmarks.

### FR-INIT: Project Initialization

- **Description:** The `flowai-init` skill bootstraps AI agent understanding of a project by analyzing codebase, generating 3 AGENTS.md files (root, `documents/`, `scripts/`), and scaffolding documentation. Uses `generate_agents.ts` (Deno/TS, read-only) for project analysis and template files from `assets/` as reference for agent-driven file generation.
- **Use case scenario:** User runs `/flowai-init` on existing or new project. Agent runs the analysis script, determines Greenfield vs Brownfield by its own judgment, interviews user (Greenfield) or reverse-engineers architecture (Brownfield), generates 3 AGENTS.md files, documentation (SRS, SDS, whiteboard), and configures development commands.
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
- **Desc:** When `claude` IDE configured, create `CLAUDE.md -> AGENTS.md` symlinks wherever `AGENTS.md` exists.
- **Acceptance:**
  - [x] Scans project, creates/updates symlinks.
  - [x] Skips existing regular files.

#### FR-DIST.DETECT IDE Auto-Detection
- **Desc:** Detect IDEs by config dir presence (`.cursor/`, `.claude/`, `.opencode/`).
- **Acceptance:**
  - [x] Detects 3 IDEs.
  - [x] Used as default when `ides` not in `.flowai.yaml`.

#### FR-DIST.UPDATE Self-Update Check
- **Desc:** Before sync, checks JSR for newer version. Fail-open (network errors ignored).
- **Acceptance:**
  - [x] Fetches JSR meta, compares semver.
  - [x] `--skip-update-check` flag.
  - [x] 5s timeout, fail-open.

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

#### FR-DIST.MAPPING Cross-IDE Resource Mapping (universal representation)

- **Desc:** Defines how each logical resource type maps to IDE-specific paths and formats. flowai uses these mappings during framework sync (FR-DIST.SYNC) and user sync (FR-DIST.USER-SYNC).

**Resource type mapping:**

| Logical type | Cursor | Claude Code | OpenCode |
|:---|:---|:---|:---|
| **Command** (user-invoked only) | `.cursor/commands/foo.md` — flat md, no frontmatter | `.claude/commands/foo.md` — flat md, optional frontmatter (`allowed-tools`, `model`) | `.opencode/commands/foo.md` — flat md, `$ARGUMENTS` + shell interpolation |
| **Skill** (model-invocable) | `.cursor/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.claude/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.opencode/skills/foo/SKILL.md` — dir, same format |
| **Skill-command** (user-invoked skill) | `.cursor/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.claude/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.opencode/skills/foo/SKILL.md` with `disable-model-invocation: true` |
| **Agent** | `.cursor/agents/foo.md` — frontmatter: `name`, `description`, `readonly`, `model` | `.claude/agents/foo.md` — frontmatter: `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color` | `.opencode/agents/foo.md` — frontmatter: `description`, `mode`, `model`, `color`, `steps`, `tools` (map) |

**Agent frontmatter field mapping (universal → IDE):**

| Universal field | Cursor | Claude Code | OpenCode |
|:---|:---|:---|:---|
| `name` | kept | kept | dropped |
| `description` | kept | kept | kept |
| `tools` (string) | dropped | kept | dropped |
| `disallowedTools` | dropped | kept | dropped |
| `readonly` | kept | dropped | dropped |
| `mode` | dropped | dropped | kept |
| `opencode_tools` (map) | dropped | dropped | renamed → `tools` |
| `model` (tier) | resolved to IDE-native | resolved to IDE-native | resolved from .flowai.yaml or omitted |
| `effort` | dropped | kept | dropped |
| `maxTurns` | dropped | kept | renamed → `steps` |
| `background` | dropped | kept | dropped |
| `isolation` | dropped | kept | dropped |
| `color` | dropped | kept | kept |
| unknown fields | pass-through | pass-through | pass-through |

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
- **Acceptance verified by benchmarks:** `flowai-review-and-commit-approve`, `flowai-review-and-commit-reject`, `flowai-review-and-commit-auto-docs`, `flowai-review-and-commit-suggest-reflect`, `flowai-review-and-commit-parallel-delegation`

### FR-DEVCONTAINER: AI Devcontainer Setup — flowai-skill-setup-ai-ide-devcontainer

- **Description:** Generates `.devcontainer/` config optimized for AI IDE development. Stack detection, AI CLI integration, global skills mounting, security hardening.
- **Acceptance verified by benchmarks:** `flowai-skill-setup-ai-ide-devcontainer-node-basic`, `flowai-skill-setup-ai-ide-devcontainer-deno-with-claude`, `flowai-skill-setup-ai-ide-devcontainer-brownfield-existing`, `flowai-skill-setup-ai-ide-devcontainer-feature-discovery`, `flowai-skill-setup-ai-ide-devcontainer-opencode-multi-cli`

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

**Script Requirements**

- **Acceptance criteria:**
  - [x] **Non-interactive**: Scripts MUST NOT use interactive prompts (stdin confirmation, interactive menus). All input via CLI flags, env vars, or stdin piping. Agents run in non-interactive shells. All 17 scripts use CLI args/env/stdin piping; none use interactive prompts.
  - [x] **Structured output**: Scripts MUST output structured data (JSON preferred) to stdout. Diagnostics/progress to stderr. This enables reliable parsing by any agent implementation. All framework scripts output `{ "ok": bool, "result": {...} }` JSON to stdout. Diagnostics go to stderr via `console.error()`.
  - [x] **Self-contained dependencies**: Scripts MUST declare dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for Deno/TS). No implicit global installs required. All framework scripts use `jsr:` specifiers. No bare `@std/` imports remain in `framework/skills/`.
  - [N/A] **Help output**: Scripts SHOULD implement `--help` flag as the primary way agents learn the script interface. Dropped: agents read SKILL.md for script interface; `--help` duplicates SKILL.md and adds maintenance burden.
  - [x] **Meaningful exit codes**: Exit 0 on success, non-zero on failure. Scripts SHOULD use distinct codes for different error types. All 17 scripts exit 0/non-zero correctly. Verified across `scripts/` and `framework/skills/*/scripts/`.
  - [x] **Read-only by default**: Analysis/validation scripts MUST NOT create, write, or modify project files. File creation is the agent's responsibility unless the script's explicit purpose is generation. Analysis scripts (`generate_agents.ts`, `check-skills.ts`, `check-agents.ts`) are read-only.
  - [x] **Idempotent**: Scripts MUST be safe to run multiple times with the same input producing the same output. Validation/check scripts are inherently idempotent (read-only). Init scripts support `--skip-existing` flag for idempotent mode; default is fail-fast on conflict.
  - [x] **Error messages**: Scripts MUST provide clear, actionable error messages to stderr. Include what failed, why, and how to fix. All 17 scripts write diagnostics to stderr via `console.error()`.
  - [x] **Dry-run support**: Scripts performing destructive operations SHOULD support `--dry-run` flag. N/A — no framework scripts perform destructive operations. All are analysis/validation/symlink tools.

**Script Language Policy**

- **Acceptance criteria:**
  - [x] **Framework scripts in Deno/TS**: All framework product scripts (`framework/skills/*/scripts/`) MUST be written in Deno/TypeScript. Zero `.py` files in `framework/skills/`.
  - [x] **General-purpose utilities in Python**: Utility scripts outside the framework product directory MAY use Python. Scripts inside `framework/skills/*/scripts/` MUST be Deno/TS per FR-UNIVERSAL.LANG. Policy documented in SDS (section 3.1.2 "Script Language Policy"). Project uses Deno/TS exclusively — no Python.
  - [x] **User-facing skills are language-agnostic**: The agentskills.io standard allows any language. Framework documentation (e.g., `flowai-skill-engineer-skill`) MUST NOT restrict users to a single language. Common options: Python, Bash, JavaScript/TypeScript. `flowai-skill-engineer-skill` does not restrict script language; examples mention multiple options.

#### FR-UNIVERSAL.EXEC Script Execution Model

- **Acceptance criteria:**
  - [x] **Agent-driven execution**: Scripts are NOT auto-executed. The agent reads SKILL.md instructions and decides when to run scripts using its standard code execution tool (Bash/terminal). This is consistent across all three IDEs. All SKILL.md files use imperative instructions ("Run…", "Execute…") directing the agent; no auto-execution hooks.
  - [x] **No dedicated script runner**: There is no special "script runner" tool in any supported IDE. All script execution goes through the generic Bash/terminal tool. Confirmed: all three IDEs (Cursor, Claude Code, OpenCode) use Bash/terminal for script execution.
  - [x] **allowed-tools hint**: Skills MAY use the `allowed-tools` frontmatter field (experimental) to pre-approve tools needed for script execution (e.g., `Bash(deno:*)`). This reduces permission prompts but is not guaranteed across all IDEs. Documented in SDS (section 3.1.3 "Skill Tool Hints"). Adoption is optional per agentskills.io spec.

#### FR-UNIVERSAL.DISCOVERY Skill Discovery Paths

- **Acceptance criteria:**
  - [x] **Framework distribution**: Framework skills distributed from `framework/skills/` to IDE directories via flowai. See FR-DIST.
  - [x] **Cross-IDE discovery**: Skills discoverable by IDEs via IDE-specific config dirs (e.g., `.claude/skills/`). flowai handles placement per IDE.
  - [x] **Name collision**: Project-level skills override user-level skills when names collide (per agentskills.io client implementation guide). flowai overwrites on sync. Documented in SDS (section 3.1.4).

### FR-UPDATE: Framework Update — `flowai-update`

- **Description:** Single entry point for updating the flowai framework. Handles CLI update, skill/agent sync via `flowai sync`, and migration of scaffolded project artifacts using template diffs as migration source.
- **Acceptance verified by benchmarks:** `flowai-update-basic`, `flowai-update-skill-adaptation`, `flowai-update-sync-command`, `flowai-update-template-vs-artifact`

### FR-PACKS: Pack System — Modular Resource Installation

- **Description:** Reorganize framework resources into self-contained packs. Each pack is an autonomous directory containing skills, agents, hooks, and scripts. Users select packs in `.flowai.yaml` instead of listing individual resource names. Replaces flat `framework/skills/` and `framework/agents/` structure.
- **Use case scenario:** Developer runs `flowai sync` with `.flowai.yaml` containing `packs: [core, deno]`. Only resources from those packs are installed. Another developer with `packs: []` gets only core pack.
- **Priority:** High (enables scalable resource management, unblocks hooks/scripts).

#### FR-PACKS.STRUCT Pack Structure

- **Desc:** Each pack is a directory under `framework/<name>/` containing `pack.yaml` manifest and resource subdirectories (`skills/`, `agents/`, `hooks/`, `scripts/`). Resources discovered by convention (directory scan), not listed in manifest.
- **Acceptance:**
  - [x] `pack.yaml` format: `name` (string), `version` (semver), `description` (string).
  - [x] Skills stored as `framework/<pack>/skills/<name>/SKILL.md`.
  - [x] Agents stored as `framework/<pack>/agents/<name>.md`.
  - [x] No dependencies between packs — each pack is self-contained.
  - [x] `framework/skills/` and `framework/agents/` removed. All resources live in packs.

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

- **Desc:** `scripts/bundle-framework.ts` updated to scan `framework/*/` instead of `framework/skills/` + `framework/agents/`.
- **Acceptance:**
  - [x] Bundle includes pack definitions and all pack resources.
  - [x] Existing tests updated for new bundle structure.

#### FR-PACKS.DEFAULTS Default Packs

- **Desc:** `flowai init` (interactive config generation) defaults to all packs.
- **Acceptance:**
  - [x] Generated `.flowai.yaml` includes all available packs.

### FR-HOOK-RESOURCES: Hook Resources

- **Description:** Packs contain hooks — Deno TS scripts triggered by IDE events (PostToolUse, PreToolUse). Hooks are IDE-agnostic: stored as `hook.yaml` + `run.ts`, installed by flowai with IDE-specific configuration generation. Claude Code naming as canonical; flowai transforms for other IDEs.
- **Use case scenario:** Pack `core` contains `flowai-lint-on-write` hook. `flowai sync` for Claude Code adds entry to `settings.json` hooks section; for Cursor — generates `.cursor/hooks.json`; for OpenCode — generates plugin file.
- **Priority:** Medium (new resource type, depends on FR-PACKS).

#### FR-HOOK-RESOURCES.FORMAT Hook Format

- **Desc:** Hook = directory with `hook.yaml` (metadata) + `run.ts` (Deno script). Located at `framework/<pack>/hooks/<name>/`.
- **Acceptance:**
  - [x] `hook.yaml` fields: `event`, `matcher` (optional), `description`, `timeout` (optional, default 30/600).
  - [x] Supported events: PostToolUse, PreToolUse, SessionStart. Event/tool name mapping per IDE.
  - [x] `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. SessionStart hooks output `hookSpecificOutput.additionalContext`.
  - [x] 5 framework hooks: `flowai-lint-on-write` (core), `flowai-test-before-commit` (core), `flowai-session-init-docs` (core), `flowai-skill-structure-validate` (devtools), `flowai-mermaid-validate` (engineering).

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

### FR-REFLECT: Reflection with Session History Search

- **Description:** Reflection skills (`flowai-reflect`) must search session history for similar errors/mistakes, identify patterns, and include findings in output.
- **Acceptance verified by benchmarks:** `flowai-reflect-session-history-pattern`, `flowai-reflect-context-inefficiency`, `flowai-reflect-process-loop`

### FR-CICD: CI/CD Pipeline Security

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-CICD.PIN SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment.
  - [ ] **FR-CICD.PRIV Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [ ] **FR-CICD.INTEGRITY File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [ ] **FR-CICD.JOBS Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.

### FR-WB-CLEANUP: Whiteboard Cleanup on Commit

- **Description:** `flowai-commit` deletes referenced whiteboard after commit when all Definition of Done items are satisfied. If DoD is partially complete, asks user. Prevents stale whiteboards from accumulating.
- **Acceptance verified by benchmarks:** `flowai-commit-whiteboard-cleanup`, `flowai-commit-whiteboard-cleanup-partial`

### FR-REVIEW-SPLIT: Responsibility Separation: Review vs Commit

- **Description:** Clear separation of concerns between `flowai-review` and `flowai-commit`:
  - Review owns: project checks (lint/test), hygiene scan, code quality verdict
  - Commit owns: documentation audit, atomic grouping, commit execution, whiteboard cleanup
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
