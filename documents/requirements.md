# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and
  Commands project.
- **Scope:** A collection of skills, agents, and commands to standardize and
  enhance development workflows in AI-first IDEs (Cursor, Claude Code, OpenCode).
- **Audience:** Developers and AI agents working in supported AI IDEs.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).
  - **SPOT:** Single Point of Truth.

## 2. General description

- **System context:** A set of configuration files (`.md`, SKILL.md) stored in
  `framework/` (product) and `.claude/` (dev resources). Distributed to end users
  via flowai. Interpreted by AI agents in supported IDEs.
- **Assumptions and constraints:**
  - **Assumptions:** Developer uses Claude Code. macOS/Linux environment.
    flowai installed for framework resource sync.
  - **Constraints:** Agent's context window limits apply.
    Hook/plugin systems differ per IDE (Cursor hooks, Claude Code hooks with
    17+ events, OpenCode plugins) — format transformation needed.

## 3. Functional requirements

### Implementation Order (open requirements)

Dependencies between unclosed requirements define execution order:

1. **FR-23** Pack System — restructure framework, update flowai CLI
2. **FR-24** Hook Resources — depends on FR-23 (pack structure)
3. **FR-25** Script Resources — depends on FR-23 (pack structure)
4. **FR-26** Skill Renaming — depends on FR-23 (migration)
5. **FR-21.3–21.6** Universal Skill & Script Requirements — standardize before distribution
6. **FR-12.5** flowai-init idempotent re-run — independent, can run in parallel with 5
7. **FR-7.1** Co-locate benchmarks with skills — can run in parallel with 5–6

```
FR-23 (pack system)
  → FR-24 (hooks), FR-25 (scripts), FR-26 (renaming) — parallel after FR-23
FR-21.3–21.6 (parallel with above)
FR-12.5 (parallel)
FR-7.1 (parallel)
FR-10.9 open questions (parallel)
```

Note: FR-20 (Devcontainer) is complete for the framework's own dev workflow.
FR-10 (Global Framework Distribution) has been delegated to flowai (external tool).
FR-10.9 defines cross-IDE resource mapping; open questions need user decisions before command sync implementation.

### 3.1 Command Execution (FR-1)

- **Description:** The system must provide executable workflows for common
  development tasks, accessible via chat commands (`/<command>`).
- **Acceptance verified by benchmarks:** See Component Coverage Matrix (section 3.8) — all commands benchmarked.

### 3.2 Rule Enforcement (FR-2)

- **Description:** The system must automatically apply development rules and
  coding standards (code style, TDD, documentation).
- **Acceptance verified by benchmarks:** `flowai-setup-agent-code-style-ts-deno-basic`, `flowai-setup-agent-code-style-ts-strict-basic`

### 3.3 Documentation Management (FR-3)

- **Description:** The system must define and enforce documentation schemas
  (SRS/SDS) to maintain project knowledge.
- **Acceptance:** Enforced by `documents/AGENTS.md` rules. Evidence: `documents/AGENTS.md`.

### 3.4 Automation & How-To (FR-4)

- **Description:** The system must provide guides (`flowai-skill-*`) for complex
  or situational tasks (QA, testing, diagrams, prompts, research, etc.).
- **Acceptance verified by benchmarks:** See Component Coverage Matrix (section 3.8) — all skills benchmarked.

### 3.5 Project Maintenance (FR-5)

- **Description:** The system must provide automated project maintenance via
  `deno task check` (linting, testing, validation).
- **Acceptance:**
  - [x] Deno tasks configured in `deno.json`. Evidence: `deno.json:11-18`
  - [x] Task scripts in `./scripts/`. Evidence: `scripts/task-check.ts`, `scripts/task-test.ts`

### 3.6 Developer Onboarding & Workflow Clarity (FR-6)

- **Description:** The project's `README.md` must provide clear, actionable
  instructions for developers on when and how to use the available tools.
- **Use case scenario:** A new developer joins the project and reads the
  `README.md` to understand the workflow for starting the project, implementing
  a task, and performing periodic maintenance.
- **Acceptance criteria:**
  - [x] Instructions for project initialization and environment verification.
        Evidence: `README.md:73-99`, `README.md:120-126`
  - [x] Step-by-step workflow for task implementation (Plan -> Execute -> Verify
        -> Commit). Evidence: `README.md:127-135`
  - [x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent
        Updates). Evidence: `README.md:137-141`
  - [x] Guidance for specific cases (Investigate, Answer, Engineer). Evidence:
        `README.md:139-140`, `README.md:156-162`

### 3.7 Benchmarking (FR-7)

- **Description:** Evidence-based benchmarking system to evaluate agent skill
  execution quality. `deno task bench`.
- **Key capabilities:** Isolated sandbox execution (`SpawnedAgent`), LLM-based
  Judge, evidence collection, interactive flows (`UserEmulator`), cost/token
  tracking, HTML tracing, parallel execution protection.
- **Architecture:** Co-located scenarios (`framework/<pack>/skills/<skill>/benchmarks/`),
  pack-scoped sandbox, Claude CLI judge (`cliChatCompletion`), mandatory
  `agentsTemplateVars` (compile-time enforced).
- **Implementation:** `scripts/benchmarks/lib/` (runner, judge, spawned_agent,
  user_emulator, trace, types, utils).

### 3.8 Component Coverage

All 38 skills have at least one benchmark scenario. Coverage is the source of
truth: `find framework -name "mod.ts" -path "*/benchmarks/*" | wc -l`.
Agents (4 canonical definitions) are not benchmarked individually — they are
exercised as subagents within skill benchmarks.

### 3.9 Project Initialization (FR-8)

- **Description:** The `flowai-init` skill bootstraps AI agent understanding of a
  project by analyzing codebase, generating 3 AGENTS.md files (root,
  `documents/`, `scripts/`), and scaffolding documentation. Uses
  `generate_agents.ts` (Deno/TS, read-only) for project analysis and template
  files from `assets/` as reference for agent-driven file generation.
- **Use case scenario:** User runs `/flowai-init` on existing or new project. Agent
  runs the analysis script, determines Greenfield vs Brownfield by its own
  judgment, interviews user (Greenfield) or reverse-engineers architecture
  (Brownfield), generates 3 AGENTS.md files, documentation (SRS, SDS,
  whiteboard), and configures development commands.
- **Acceptance verified by benchmarks:** `flowai-init-greenfield`, `flowai-init-brownfield`, `flowai-init-brownfield-update`, `flowai-init-brownfield-idempotent`, `flowai-init-vision-integration`, `flowai-init-claude-md-symlinks`
- **Infrastructure acceptance (code/scripts):**
  - [x] **FR-8.13 Stack detection**: `generate_agents.ts` detects 6 stacks
        via marker files. Evidence:
        `framework/core/skills/flowai-init/scripts/generate_agents.ts:76-92`
  - [x] **FR-8.14 Unit tests**: `generate_agents.test.ts` covers 8 scenarios.
        Evidence: `framework/core/skills/flowai-init/scripts/generate_agents.test.ts`

### 3.9 Multi-IDE Dev Resource Distribution (FR-9)

- **Description:** Dev resources (skills, agents, scripts) in `.claude/` are generated
  by `deno task sync-local` from `framework/` directly. NOT tracked in git. Auto-synced
  via SessionStart (bootstrap) and SessionEnd (persist changes) hooks.
- **Use case scenario:** Developer clones project. SessionStart hook detects empty
  `.claude/skills/` and runs `deno task sync-local` to populate from `framework/`.
  Changes to `framework/` are re-synced on each SessionEnd.
- **Acceptance criteria:**
  - [x] `.claude/skills/`, `.claude/agents/`, `.claude/scripts/` gitignored. Evidence:
        `.gitignore`
  - [x] SessionStart hook bootstraps `.claude/` if empty. Evidence:
        `.claude/settings.json` (`SessionStart` hook)
  - [x] SessionEnd hook re-syncs `.claude/` from `framework/` after each session. Evidence:
        `.claude/settings.json` (`SessionEnd` hook)
  - [x] `deno task sync-local` uses `LocalSource` (reads `framework/` on disk). Evidence:
        `cli/src/source.ts` (`LocalSource`), `scripts/task-sync-local.ts`
  - [x] `check-skills.ts` validates `.claude/skills/` (dev skills). Evidence:
        `scripts/check-skills.ts:308-311`

### 3.10 Global Framework Distribution — flowai (FR-10)

- **Description:** `flowai` CLI tool (`cli/` monorepo directory, published to JSR as `@korchasa/flowai`) syncs framework skills/agents into project-local IDE config dirs. Single command, no subcommands. Reads bundled framework data (no network dependency at runtime).
- **Def/Abbr:** CLI = flowai, BundledSource = JSON artifact with all framework files baked at publish time.

#### FR-10.1 Sync Command (`flowai`)
- **Desc:** Single command `flowai` run in project dir. Reads bundled framework, syncs skills/agents to IDE config dirs.
- **Scenario A (no config, interactive):** `flowai` without `.flowai.yaml` → interactive prompts (IDEs, packs) → generates `.flowai.yaml` → syncs.
- **Scenario A2 (no config, non-interactive):** `flowai -y` without `.flowai.yaml` → auto-detect IDEs, select all packs → generates `.flowai.yaml` with defaults → syncs.
- **Scenario B (with config):** `flowai` with `.flowai.yaml` → disclaimer → sync. Bundled files compared with local. Unchanged silently, locally modified → prompt.
- **Acceptance:**
  - [x] Without `.flowai.yaml` → interactive config generation → sync. Evidence: `cli/src/cli.ts:30-36`, `cli/src/config_generator.ts:20-100`
  - [x] With `.flowai.yaml` → disclaimer → sync. Evidence: `cli/src/cli.ts:39-56`, `cli/src/sync.ts:52-138`
  - [x] Files read from `BundledSource` (bundled.json). Evidence: `cli/src/source.ts:12-50`, `cli/src/source_test.ts:7-42`
  - [x] Skills written to `{ide_dir}/skills/{name}/`. Evidence: `cli/src/sync.ts:94-100`, `cli/src/main_test.ts:56-69`
  - [x] Agents transformed per-IDE via `transformAgent()`. Evidence: `cli/src/sync.ts:108-136`, `cli/src/transform.ts:31-60`
  - [x] Idempotent: safe on repeated runs. Evidence: `cli/src/plan.ts:17-30`
  - [x] `--yes` / `-y` flag for non-interactive mode. Evidence: `cli/src/cli.ts:21-23`
  - [x] `-y` without config → non-interactive config generation (auto-detect IDEs, all packs). Evidence: `cli/src/cli.ts:88-90`, `cli/src/config_generator.ts:13-54`

#### FR-10.2 Config Generation
- **Desc:** Interactive `.flowai.yaml` creation when config missing.
- **Acceptance:**
  - [x] Prompts: IDEs (auto-detected), skills include/exclude, agents include/exclude. Evidence: `cli/src/config_generator.ts:27-100`
  - [x] Reads available skills/agents from BundledSource. Evidence: `cli/src/config_generator.ts:47-58`
  - [x] Writes valid `.flowai.yaml`. Evidence: `cli/src/config.ts:71-80`

#### FR-10.3 Selective Sync
- **Desc:** `.flowai.yaml` controls which skills/agents to sync.
- **Acceptance:**
  - [x] Include/exclude filters for skills and agents. Evidence: `cli/src/sync.ts:186-191`, `cli/src/sync_test.ts:5-18`
  - [x] Include + exclude mutually exclusive. Evidence: `cli/src/config.ts:55-65`

#### FR-10.4 CLAUDE.md Symlinks
- **Desc:** When `claude` IDE configured, create `CLAUDE.md -> AGENTS.md` symlinks wherever `AGENTS.md` exists.
- **Acceptance:**
  - [x] Scans project, creates/updates symlinks. Evidence: `cli/src/symlinks.ts:21-55`, `cli/src/symlinks_test.ts`
  - [x] Skips existing regular files. Evidence: `cli/src/symlinks.ts:41-43`

#### FR-10.5 IDE Auto-Detection
- **Desc:** Detect IDEs by config dir presence (`.cursor/`, `.claude/`, `.opencode/`).
- **Acceptance:**
  - [x] Detects 3 IDEs. Evidence: `cli/src/types.ts:46-48`, `cli/src/ide_test.ts`
  - [x] Used as default when `ides` not in `.flowai.yaml`. Evidence: `cli/src/ide.ts:19-30`

#### FR-10.6 Self-Update Check
- **Desc:** Before sync, checks JSR for newer version. Fail-open (network errors ignored).
- **Acceptance:**
  - [x] Fetches JSR meta, compares semver. Evidence: `cli/src/version.ts:36-62`
  - [x] `--skip-update-check` flag. Evidence: `cli/src/cli.ts:22-25`
  - [x] 5s timeout, fail-open. Evidence: `cli/src/version.ts:9`, `cli/src/version_test.ts`

#### FR-10.7 Bundled Source
- **Desc:** Framework files bundled into `cli/src/bundled.json` at publish time. No network dependency during sync.
- **Acceptance:**
  - [x] `scripts/bundle-framework.ts` generates bundle from `../framework/`. Evidence: `cli/scripts/bundle-framework.ts`
  - [x] `BundledSource` reads bundle. Evidence: `cli/src/source.ts:12-50`, `cli/src/source_test.ts:33-42`
  - [x] Guard: `task-check.ts` runs bundle before tests. Evidence: `scripts/task-check.ts:10-13`

#### FR-10.8 Cross-IDE User Resource Sync

- **Desc:** When `user_sync: true` in `.flowai.yaml` and ≥2 IDEs configured, propagate user-created resources (non-`flowai-*`, non-framework) across IDE config dirs. Canonical source = newest mtime.
- **Acceptance:**
  - [x] Scans skills/agents in each IDE dir, skips `flowai-*` prefix. Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/user_sync_test.ts:39-53`
  - [x] Skips framework-bundled resources by name (e.g., `flowai-deep-research-worker`). Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/sync.ts:148-150`
  - [x] Merges by `(type, name)` across IDEs, picks canonical by newest mtime. Evidence: `cli/src/user_sync.ts:284-293`
  - [x] Agent frontmatter transformed per IDE via `crossTransformAgent()`. Evidence: `cli/src/user_sync.ts:219-226`
  - [x] Invalid YAML frontmatter: copies as-is with warning (no crash). Evidence: `cli/src/transform.ts:113-128`, `cli/src/transform_test.ts`
  - [x] Skills copied as-is (no frontmatter transform). Evidence: `cli/src/user_sync.ts:218-228`
  - [x] Conflict prompt in interactive mode; `--yes` overwrites. Evidence: `cli/src/sync.ts:198-223`
  - [x] Skipped when <2 IDEs. Evidence: `cli/src/user_sync.ts:318-321`
  - [x] Idempotent: repeated runs produce 0 writes. Evidence: manual verification

#### FR-10.9 Cross-IDE Resource Mapping (universal representation)

- **Desc:** Defines how each logical resource type maps to IDE-specific paths and formats. flowai uses these mappings during framework sync (FR-10.1) and user sync (FR-10.8).

**Resource type mapping:**

| Logical type | Cursor | Claude Code | OpenCode |
|:---|:---|:---|:---|
| **Command** (user-invoked only) | `.cursor/commands/foo.md` — flat md, no frontmatter | `.claude/commands/foo.md` — flat md, optional frontmatter (`allowed-tools`, `model`) | `.opencode/commands/foo.md` — flat md, `$ARGUMENTS` + shell interpolation |
| **Skill** (model-invocable) | `.cursor/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.claude/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.opencode/skills/foo/SKILL.md` — dir, same format |
| **Skill-command** (user-invoked skill) | `.cursor/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.claude/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.opencode/skills/foo/SKILL.md` with `disable-model-invocation: true` |
| **Agent** | `.cursor/agents/foo.md` — frontmatter: `name`, `description`, `readonly` | `.claude/agents/foo.md` — frontmatter: `name`, `description`, `tools`, `disallowedTools` | `.opencode/agents/foo.md` — frontmatter: `description`, `mode`, `tools` (map) |

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
| unknown fields | pass-through | pass-through | pass-through |

**Cross-IDE sync transformations (user_sync):**

| Source → Target | Resource type | Transform |
|:---|:---|:---|
| Skill (any IDE pair) | skill | Copy dir as-is (format identical across IDEs) |
| Skill with extra files (references/, scripts/) | skill | Copy entire dir tree |
| Agent (cursor → claude) | agent | Frontmatter: keep `name`+`description`+`tools`+`disallowedTools`, drop `readonly` |
| Agent (claude → cursor) | agent | Frontmatter: keep `name`+`description`+`readonly`, drop `tools`+`disallowedTools` |
| Agent (any → opencode) | agent | Frontmatter: keep `description`+`mode`, rename `opencode_tools`→`tools`, drop rest |
| Agent (invalid YAML) | agent | Copy as-is, log warning |
| Command (cursor → claude) | command | Copy `.cursor/commands/foo.md` → `.claude/commands/foo.md` as-is |
| Command (cursor → opencode) | command | Copy `.cursor/commands/foo.md` → `.opencode/commands/foo.md` as-is |

**Not synced (by design):**

- Framework resources (`flowai-*` prefix or matching bundled names) — managed by framework sync (FR-10.1)
- Rules (`.cursor/rules/` ↔ `.claude/rules/`) — frontmatter differs fundamentally (globs vs paths), no automated transform
- Hooks (`.cursor/hooks.json` ↔ `.claude/settings.json` hooks key) — structure and event names differ, no automated transform
- MCP config (`mcp.json` ↔ `.mcp.json`) — trivial rename, user responsibility

**Open questions:**

- [ ] Should `user_sync` also propagate `.cursor/commands/` ↔ `.claude/commands/` ↔ `.opencode/commands/`?
- [ ] Should skills with `disable-model-invocation: true` in one IDE map to commands in another?

- **Acceptance:**
  - [x] Agent transform implemented per mapping table above. Evidence: `cli/src/transform.ts:38-70`, `cli/src/transform_test.ts`
  - [x] Skill copy preserves dir structure with extra files. Evidence: `cli/src/user_sync.ts:89-104`
  - [x] Framework resources excluded from user sync. Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/sync.ts:148-150`
  - [ ] Command sync across IDEs (pending open question resolution)

### 3.11 Conventional Commits — `agent` Type (FR-11)

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention
  used by `flowai-commit`. Covers changes to agents, skills, `AGENTS.md`, and other
  AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent
  definition. On commit, the message is prefixed with `agent:` (e.g.,
  `agent: update flowai-commit skill with atomic grouping rules`).
- **Acceptance verified by benchmarks:** `flowai-commit-agent-type`

### 3.12 flowai-init Idempotency with User Edit Preservation (FR-12)

- **Description:** `flowai-init` must be fully idempotent: re-running on an already
  initialized project must preserve user's manual edits in `AGENTS.md` and other
  generated files. Framework-managed sections are updated; user-added sections are
  kept intact.
- **Use case scenario:** User runs `/flowai-init` on a project that already has
  `AGENTS.md` with custom rules added by the user. The agent updates
  framework-generated sections (e.g., templates, stack info) but preserves all
  user-added content.
- **Acceptance verified by benchmarks:** `flowai-init-brownfield-update`, `flowai-init-brownfield-idempotent`

### 3.13 Migrate Framework-Specific Python Scripts to Deno/TypeScript (FR-13)

- **Description:** Python scripts in `framework/skills/` are split into two categories:
  **framework-specific** (flowai lifecycle tooling: init, validate, package for
  commands/skills/rules) — must be migrated to Deno/TS to eliminate Deno users'
  Python dependency. **General-purpose** (universally useful utilities: token counting,
  Mermaid validation) — remain in Python as they serve any project regardless of
  framework.
- **Use case scenario:** User installs flowai framework. Framework lifecycle
  scripts (scaffolding, validation, packaging) execute via `deno run`. General-purpose
  utility scripts remain as `python3` invocations (Python available in target
  environments).
- **Acceptance criteria:**
  - [x] **FR-13.1 Framework scripts migrated** (8 files → Deno/TS). Evidence:
    - `framework/skills/flowai-skill-engineer-command/scripts/init_command.ts`
    - `framework/skills/flowai-skill-engineer-command/scripts/validate_command.ts`
    - `framework/skills/flowai-skill-engineer-command/scripts/package_command.ts`
    - `framework/skills/flowai-skill-engineer-rule/scripts/init_rule.ts`
    - `framework/skills/flowai-skill-engineer-rule/scripts/validate_rule.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/init_skill.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/package_skill.ts`
  - [x] **FR-13.2 General-purpose scripts remain Python** (2 files). Evidence:
    - `framework/skills/flowai-skill-analyze-context/scripts/count_tokens.py`
    - `framework/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.py`
  - [x] **FR-13.3 Behavioral parity**: Each migrated `.ts` script produces identical
        output (stdout messages, exit codes) as the Python original. Verified via
        56 unit tests covering all validation logic. Evidence:
        `framework/skills/flowai-skill-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-skill/scripts/skill_scripts_test.ts`
  - [x] **FR-13.4 SKILL.md references updated**: `flowai-skill-engineer-command`,
        `flowai-skill-engineer-rule`, `flowai-skill-engineer-skill` SKILL.md files reference
        `deno run -A scripts/*.ts` instead of `python3 scripts/*.py`. Evidence:
        `framework/skills/flowai-skill-engineer-command/SKILL.md:292`,
        `framework/skills/flowai-skill-engineer-rule/SKILL.md:215`,
        `framework/skills/flowai-skill-engineer-skill/SKILL.md:259-282`
  - [x] **FR-13.5 Stack update**: `AGENTS.md` tooling stack notes Python as
        "general-purpose utility scripts only" (not removed entirely). Evidence:
        `AGENTS.md:54`
  - [x] **FR-13.6 Tests**: 56 unit tests across 3 test files:
        `command_scripts_test.ts` (18), `skill_scripts_test.ts` (19),
        `rule_scripts_test.ts` (19). All pass. Evidence:
        `framework/skills/flowai-skill-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-skill/scripts/skill_scripts_test.ts`

### 3.14 Cross-IDE Hook/Plugin Format Transformation (FR-14)

- **Description:** Three IDEs have different hook/plugin formats. The framework
  provides cross-IDE documentation in `flowai-skill-engineer-hook` SKILL.md with
  IDE-specific reference files, enabling agents to generate correct configs.
- **Design decision:** Canonical format = documented templates with IDE-specific
  reference files (not a separate schema). LLMs reliably follow template patterns.
- **Acceptance verified by benchmarks:** `flowai-skill-engineer-hook-basic-claude-code`

### 3.15 Update `flowai-skill-engineer-hook` for Cross-IDE Support (FR-15)

- **Description:** `flowai-skill-engineer-hook` covers Claude Code (18 events,
  4 hook types), Cursor hooks, and OpenCode plugins.
- **Acceptance verified by benchmarks:** `flowai-skill-engineer-hook-basic-claude-code`

### 3.16 Update `flowai-skill-engineer-command` for Claude Code Unification (FR-16)

- **Description:** Claude Code unified commands and skills under `.claude/skills/`.
  `flowai-skill-engineer-command` reflects this: Claude Code uses SKILL.md format.
- **Acceptance verified by benchmarks:** `flowai-skill-engineer-command-create`

### 3.17 Resolve IDE Support Scope (FR-17)

- **Description:** Supported IDEs narrowed to 3: Cursor, Claude Code, OpenCode.
  Codex and Antigravity removed from all SKILL.md files, scripts, and detection logic.
- **Acceptance verified by benchmarks:** `flowai-skill-engineer-skill-basic`, `flowai-skill-engineer-rule-basic-conditional`, `flowai-skill-engineer-subagent-basic`

### 3.18 Review-and-Commit Workflow — `flowai-review-and-commit` (FR-18)

- **Description:** Composite command: review → gate (Approve only) → commit.
  Stops on Request Changes/Needs Discussion.
- **Acceptance verified by benchmarks:** `flowai-review-and-commit-approve`, `flowai-review-and-commit-reject`, `flowai-review-and-commit-auto-docs`, `flowai-review-and-commit-suggest-reflect`

### 3.19 CLAUDE.md Symlink in flowai-init (FR-19)

- **Description:** `flowai-init` creates `CLAUDE.md` symlink → `AGENTS.md` for
  Claude Code compatibility (SPOT).
- **Acceptance verified by benchmarks:** `flowai-init-claude-md-symlinks`, `flowai-init-greenfield`, `flowai-init-brownfield`

### 3.20 AI Devcontainer Setup — flowai-skill-setup-ai-ide-devcontainer (FR-20)

- **Description:** Generates `.devcontainer/` config optimized for AI IDE development.
  Stack detection, AI CLI integration, global skills mounting, security hardening.
- **Acceptance verified by benchmarks:** `flowai-skill-setup-ai-ide-devcontainer-node-basic`, `flowai-skill-setup-ai-ide-devcontainer-deno-with-claude`, `flowai-skill-setup-ai-ide-devcontainer-brownfield-existing`, `flowai-skill-setup-ai-ide-devcontainer-feature-discovery`, `flowai-skill-setup-ai-ide-devcontainer-opencode-multi-cli`

### 3.21 Universal Skill & Script Requirements (FR-21)

- **Description:** All framework skills MUST conform to the agentskills.io
  standard and work identically across supported IDEs (Cursor, Claude Code,
  OpenCode). Scripts bundled with skills MUST be cross-IDE compatible.
- **Use case scenario:** A developer installs flowai skills via
  flowai. Skills with bundled scripts work in any of the three
  supported IDEs without modification.
- **Priority:** High (foundational for multi-IDE support).

#### FR-21.1 agentskills.io Compliance

- **Acceptance criteria:**
  - [x] **FR-21.1.1 Directory structure**: Every skill is a directory with
        `SKILL.md` (required) and optional `scripts/`, `references/`, `assets/`,
        `evals/` subdirectories. No other top-level conventions (README.md, CHANGELOG.md).
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.2 Frontmatter**: `name` (required, max 64 chars, `[a-z0-9-]`,
        must match parent directory name) and `description` (required, max 1024
        chars). Optional: `license`, `compatibility`, `metadata`,
        `allowed-tools` (experimental), `disable-model-invocation`.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.3 Progressive disclosure**: Metadata (~100 tokens) loaded at
        startup; full SKILL.md (<5000 tokens, <500 lines) on activation;
        scripts/references/assets loaded only when required.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.4 File references**: One level deep from SKILL.md. No nested
        reference chains.
        Enforced by `scripts/check-skills.ts`.

#### FR-21.2 Cross-IDE Script Path Resolution

- **Acceptance criteria:**
  - [x] **FR-21.2.1 Relative paths**: SKILL.md MUST reference scripts using
        relative paths from the skill root (e.g., `scripts/validate.ts`,
        `python3 scripts/process.py`). Per agentskills.io client
        implementation guide, the IDE resolves relative paths against the
        skill's directory and converts to absolute paths in tool calls.
        All framework SKILL.md files migrated to relative paths.
  - [x] **FR-21.2.2 No custom path placeholders**: Do NOT use custom
        placeholders like `<this-skill-dir>` in framework skills. The
        agentskills.io standard defines relative paths as the canonical
        mechanism; IDEs are responsible for resolution. Existing skills
        using `<this-skill-dir>` MUST be migrated to plain relative paths.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.2.3 No IDE-specific path variables**: Do NOT use
        `${CLAUDE_SKILL_DIR}` or other IDE-specific variables in framework
        skills. These are IDE extensions, not part of the agentskills.io
        standard, and break portability.
        Enforced by `scripts/check-skills.ts`.

#### FR-21.3 Script Requirements

- **Acceptance criteria:**
  - [x] **FR-21.3.1 Non-interactive**: Scripts MUST NOT use interactive prompts
        (stdin confirmation, interactive menus). All input via CLI flags, env
        vars, or stdin piping. Agents run in non-interactive shells.
        All 17 scripts use CLI args/env/stdin piping; none use interactive prompts.
  - [x] **FR-21.3.2 Structured output**: Scripts MUST output structured data
        (JSON preferred) to stdout. Diagnostics/progress to stderr. This
        enables reliable parsing by any agent implementation.
        All framework scripts output `{ "ok": bool, "result": {...} }` JSON to stdout. Diagnostics go to stderr via `console.error()`.
  - [x] **FR-21.3.3 Self-contained dependencies**: Scripts MUST declare
        dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for
        Deno/TS). No implicit global installs required.
        All framework scripts use `jsr:` specifiers. No bare `@std/` imports remain in `framework/skills/`.
  - [N/A] **FR-21.3.4 Help output**: Scripts SHOULD implement `--help` flag as
        the primary way agents learn the script interface.
        Dropped: agents read SKILL.md for script interface; `--help` duplicates SKILL.md and adds maintenance burden.
  - [x] **FR-21.3.5 Meaningful exit codes**: Exit 0 on success, non-zero on
        failure. Scripts SHOULD use distinct codes for different error types.
        All 17 scripts exit 0/non-zero correctly. Verified across `scripts/` and `framework/skills/*/scripts/`.
  - [x] **FR-21.3.6 Read-only by default**: Analysis/validation scripts MUST
        NOT create, write, or modify project files. File creation is the
        agent's responsibility unless the script's explicit purpose is
        generation.
        Analysis scripts (`generate_agents.ts`, `check-skills.ts`, `check-agents.ts`) are read-only.
  - [x] **FR-21.3.7 Idempotent**: Scripts MUST be safe to run multiple times
        with the same input producing the same output.
        Validation/check scripts are inherently idempotent (read-only). Init scripts support `--skip-existing` flag for idempotent mode; default is fail-fast on conflict.
  - [x] **FR-21.3.8 Error messages**: Scripts MUST provide clear, actionable
        error messages to stderr. Include what failed, why, and how to fix.
        All 17 scripts write diagnostics to stderr via `console.error()`.
  - [x] **FR-21.3.9 Dry-run support**: Scripts performing destructive
        operations SHOULD support `--dry-run` flag.
        N/A — no framework scripts perform destructive operations. All are analysis/validation/symlink tools.

#### FR-21.4 Script Language Policy

- **Acceptance criteria:**
  - [x] **FR-21.4.1 Framework scripts in Deno/TS**: All framework product
        scripts (`framework/skills/*/scripts/`) MUST be written in
        Deno/TypeScript. Supersedes FR-13.2: the two remaining Python scripts
        (`count_tokens.py`, `validate.py`) must be migrated to Deno/TS.
        All 8 Python scripts removed. `count_tokens.ts` and `validate.ts` (Mermaid) written as replacements. Zero `.py` files in `framework/skills/`.
  - [x] **FR-21.4.2 General-purpose utilities in Python**: Utility scripts
        outside the framework product directory MAY use Python. Scripts inside
        `framework/skills/*/scripts/` MUST be Deno/TS per FR-21.4.1.
        Policy documented in SDS (section 3.1.2 "Script Language Policy"). Project uses Deno/TS exclusively — no Python.
  - [x] **FR-21.4.3 User-facing skills are language-agnostic**: The
        agentskills.io standard allows any language. Framework documentation
        (e.g., `flowai-skill-engineer-skill`) MUST NOT restrict users to a single
        language. Common options: Python, Bash, JavaScript/TypeScript.
        `flowai-skill-engineer-skill` does not restrict script language; examples mention multiple options.

#### FR-21.5 Script Execution Model

- **Acceptance criteria:**
  - [x] **FR-21.5.1 Agent-driven execution**: Scripts are NOT auto-executed.
        The agent reads SKILL.md instructions and decides when to run scripts
        using its standard code execution tool (Bash/terminal). This is
        consistent across all three IDEs.
        All SKILL.md files use imperative instructions ("Run…", "Execute…") directing the agent; no auto-execution hooks.
  - [x] **FR-21.5.2 No dedicated script runner**: There is no special "script
        runner" tool in any supported IDE. All script execution goes through
        the generic Bash/terminal tool.
        Confirmed: all three IDEs (Cursor, Claude Code, OpenCode) use Bash/terminal for script execution.
  - [x] **FR-21.5.3 allowed-tools hint**: Skills MAY use the `allowed-tools`
        frontmatter field (experimental) to pre-approve tools needed for
        script execution (e.g., `Bash(deno:*)`). This reduces permission
        prompts but is not guaranteed across all IDEs.
        Documented in SDS (section 3.1.3 "Skill Tool Hints"). Adoption is optional per agentskills.io spec.

#### FR-21.6 Skill Discovery Paths

- **Acceptance criteria:**
  - [x] **FR-21.6.1 Framework distribution**: Framework skills distributed
        from `framework/skills/` to IDE directories via flowai. See FR-10.
        Evidence: `cli/`, `cli/src/sync.ts`
  - [x] **FR-21.6.2 Cross-IDE discovery**: Skills discoverable by IDEs via
        IDE-specific config dirs (e.g., `.claude/skills/`). flowai handles
        placement per IDE.
  - [x] **FR-21.6.3 Name collision**: Project-level skills override user-level
        skills when names collide (per agentskills.io client implementation
        guide). flowai overwrites on sync. Documented in SDS (section 3.1.4).

### 3.22 Framework Update — `flowai-update` (FR-22)

- **Description:** Single entry point for updating the flowai framework. Handles
  CLI update, skill/agent sync via `flowai sync`, and migration of scaffolded
  project artifacts using template diffs as migration source.
- **Acceptance verified by benchmarks:** `flowai-update-basic`, `flowai-update-skill-adaptation`, `flowai-update-sync-command`, `flowai-update-template-vs-artifact`

### 3.23 Pack System — Modular Resource Installation (FR-23)

- **Description:** Reorganize framework resources into self-contained packs. Each pack is an autonomous directory containing skills, agents, hooks, and scripts. Users select packs in `.flowai.yaml` instead of listing individual resource names. Replaces flat `framework/skills/` and `framework/agents/` structure.
- **Use case scenario:** Developer runs `flowai sync` with `.flowai.yaml` containing `packs: [core, deno]`. Only resources from those packs are installed. Another developer with `packs: []` gets only core pack.
- **Priority:** High (enables scalable resource management, unblocks hooks/scripts).

#### FR-23.1 Pack Structure

- **Desc:** Each pack is a directory under `framework/<name>/` containing `pack.yaml` manifest and resource subdirectories (`skills/`, `agents/`, `hooks/`, `scripts/`). Resources discovered by convention (directory scan), not listed in manifest.
- **Acceptance:**
  - [x] **FR-23.1.1** `pack.yaml` format: `name` (string), `version` (semver), `description` (string). Evidence: `framework/core/pack.yaml`, `framework/deno/pack.yaml`, `framework/devtools/pack.yaml`, `framework/engineering/pack.yaml`, `framework/typescript/pack.yaml`
  - [x] **FR-23.1.2** Skills stored as `framework/<pack>/skills/<name>/SKILL.md`. Evidence: `framework/core/skills/flowai-commit/SKILL.md`, `framework/engineering/skills/flowai-skill-deep-research/SKILL.md`
  - [x] **FR-23.1.3** Agents stored as `framework/<pack>/agents/<name>.md`. Evidence: `framework/core/agents/flowai-console-expert.md`, `framework/engineering/agents/flowai-deep-research-worker.md`
  - [x] **FR-23.1.4** No dependencies between packs — each pack is self-contained. Evidence: by design, no cross-pack imports or references.
  - [x] **FR-23.1.5** `framework/skills/` and `framework/agents/` removed. All resources live in packs. Evidence: directories deleted, `cli/src/source.ts:109` regex `^framework\/([^/]+)\/pack\.yaml$`

#### FR-23.2 Config v1.1

- **Desc:** `.flowai.yaml` version `"1.1"` adds `packs:` field. `skills.include/exclude` applies after pack expansion.
- **Acceptance:**
  - [x] **FR-23.2.1** `packs:` field: list of pack names to install. Evidence: `cli/src/types.ts:19`, `cli/src/config.ts:84-86`
  - [x] **FR-23.2.2** `packs: []` (empty) = install only `core` pack. Evidence: `cli/src/sync.ts:69`, `cli/src/sync_test.ts` "packs: [] defaults to core only"
  - [x] **FR-23.2.3** `packs` absent + `version: "1.0"` = all resources (backward compat). Evidence: `cli/src/sync.ts:67-68`, `cli/src/sync_test.ts` "packs: undefined (v1 legacy) selects all"
  - [x] **FR-23.2.4** `skills.exclude`/`skills.include` applied AFTER pack expansion. Evidence: `cli/src/sync.ts:83-95`, `cli/src/sync_test.ts` "applies skills.exclude after pack expansion"

#### FR-23.3 Automigration v1 → v1.1

- **Desc:** `flowai sync` auto-migrates v1 config to v1.1 format, adding `packs:` with all packs listed (preserving current behavior).
- **Acceptance:**
  - [x] **FR-23.3.1** v1 config auto-migrated to v1.1 on `flowai sync`. Evidence: `cli/src/sync.ts` automigration block, `cli/src/config.ts:92-102`
  - [x] **FR-23.3.2** Migrated config lists all packs (equivalent to v1 "install everything"). Evidence: `cli/src/config.ts:100`, `cli/src/config_test.ts` "migrateV1ToV1_1 - adds all packs to v1 config"
  - [x] **FR-23.3.3** `flowai-update` skill can update `.flowai.yaml` structure. Evidence: `framework/core/skills/flowai-update/SKILL.md` step 3 parses CONFIG MIGRATED action; agent can edit `.flowai.yaml` directly.

#### FR-23.4 Pack Versioning

- **Desc:** `flowai sync` displays version changes informionally. No pinning — always installs latest from bundle.
- **Acceptance:**
  - [x] **FR-23.4.1** `flowai sync` output shows pack versions. Evidence: `cli/src/sync.ts` `readPackVersions()` + display loop

#### FR-23.5 Bundle Update

- **Desc:** `scripts/bundle-framework.ts` updated to scan `framework/*/` instead of `framework/skills/` + `framework/agents/`.
- **Acceptance:**
  - [x] **FR-23.5.1** Bundle includes pack definitions and all pack resources. Evidence: `cli/scripts/bundle-framework.ts` walks `framework/` recursively, bundle contains 298 files with `framework/<pack>/` paths
  - [x] **FR-23.5.2** Existing tests updated for new bundle structure. Evidence: `cli/src/source_test.ts` pack-aware tests, `cli/src/sync_test.ts` resolvePackResources tests

#### FR-23.6 Default Packs

- **Desc:** `flowai init` (interactive config generation) defaults to all packs.
- **Acceptance:**
  - [x] **FR-23.6.1** Generated `.flowai.yaml` includes all available packs. Evidence: `cli/src/config_generator.ts:55` `selectedPacks = [...availablePacks]`, version set to `PACKS_VERSION`

### 3.24 Hook Resources (FR-24)

- **Description:** Packs contain hooks — Deno TS scripts triggered by IDE events (PostToolUse, PreToolUse). Hooks are IDE-agnostic: stored as `hook.yaml` + `run.ts`, installed by flowai with IDE-specific configuration generation. Claude Code naming as canonical; flowai transforms for other IDEs.
- **Use case scenario:** Pack `core` contains `flowai-lint-on-write` hook. `flowai sync` for Claude Code adds entry to `settings.json` hooks section; for Cursor — generates `.cursor/hooks.json`; for OpenCode — generates plugin file.
- **Priority:** Medium (new resource type, depends on FR-23).

#### FR-24.1 Hook Format

- **Desc:** Hook = directory with `hook.yaml` (metadata) + `run.ts` (Deno script). Located at `framework/<pack>/hooks/<name>/`.
- **Acceptance:**
  - [x] **FR-24.1.1** `hook.yaml` fields: `event`, `matcher` (optional), `description`, `timeout` (optional, default 30/600). Evidence: `cli/src/types.ts:48-56`, `cli/src/hooks.ts:62-64`
  - [x] **FR-24.1.2** Supported events: PostToolUse, PreToolUse. Event/tool name mapping per IDE. Evidence: `cli/src/hooks.ts:18-28` (EVENT_MAP, TOOL_MAP)
  - [x] **FR-24.1.3** `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. Evidence: `cli/src/hooks.ts:118-150` (generateOpenCodePlugin)
  - [x] **FR-24.1.4** 4 framework hooks: `flowai-lint-on-write` (core), `flowai-test-before-commit` (core), `flowai-skill-structure-validate` (devtools), `flowai-mermaid-validate` (engineering). Evidence: `framework/core/hooks/`, `framework/devtools/hooks/`, `framework/engineering/hooks/`

#### FR-24.2 IDE-Specific Installation

- **Desc:** flowai reads `hook.yaml` and generates IDE-specific configuration. Manifest tracks installed hooks for clean deinstallation.
- **Acceptance:**
  - [x] **FR-24.2.1** Claude Code: 3-level nested entry in `settings.json` hooks section. Evidence: `cli/src/hooks.ts:78-96` (transformHookForClaude), `cli/src/sync.ts:793-822` (writeHookConfig)
  - [x] **FR-24.2.2** Cursor: flat entry in `.cursor/hooks.json`. Evidence: `cli/src/hooks.ts:99-113` (transformHookForCursor), `cli/src/sync.ts:823-849`
  - [x] **FR-24.2.3** OpenCode: generated plugin file `.opencode/plugins/flowai-hooks.ts`. Evidence: `cli/src/hooks.ts:116-150` (generateOpenCodePlugin), `cli/src/sync.ts:850-863`
  - [x] **FR-24.2.4** Manifest `.{ide}/flowai-hooks.json` tracks installed hooks. Removed hooks cleaned from IDE config. Evidence: `cli/src/hooks.ts:258-322` (cleanupRemovedHooks, readManifest, buildManifest)
  - [x] **FR-24.2.5** Merge preserves user hooks (not in manifest). Evidence: `cli/src/hooks.ts:155-206` (mergeClaudeHooks, mergeCursorHooks), `cli/src/hooks_test.ts`

#### FR-24.3 Hook Sync Infrastructure

- **Desc:** flowai discovers, reads, copies hook files, generates IDE config, and tracks actions in SyncResult.
- **Acceptance:**
  - [x] **FR-24.3.1** Hook discovery: `extractPackHookNames()` extracts hooks from `framework/<pack>/hooks/`. Evidence: `cli/src/source.ts:159-172`, `cli/src/source_test.ts:201-213`
  - [x] **FR-24.3.2** Hook files copied to `.{ide}/scripts/` during sync. Evidence: `cli/src/sync.ts:322-362`
  - [x] **FR-24.3.3** `resolvePackResources()` includes `hookNames` in return. Evidence: `cli/src/sync.ts:62`, `cli/src/sync_test.ts:101-106`
  - [x] **FR-24.3.4** `SyncResult.hookActions` tracks per-hook actions. Evidence: `cli/src/sync.ts:69`, `cli/src/cli.ts:231-251`

### 3.25 Script Resources (FR-25)

- **Description:** Packs can contain scripts — utility shell/Deno scripts callable by skills via bash. Not tied to IDE events. Copied to `.{ide}/scripts/` at install time.
- **Priority:** Low (simple copy, depends on FR-23).
- **Acceptance:**
  - [x] **FR-25.1** Scripts stored at `framework/<pack>/scripts/<name>`. Evidence: `cli/src/source.ts:174-188` (extractPackScriptNames), `cli/src/source_test.ts:215-231`
  - [x] **FR-25.2** Copied to `.{ide}/scripts/` during sync. Evidence: `cli/src/sync.ts:327-344`, `cli/src/sync.ts:547-562`, `cli/src/sync_test.ts:108-118`

### 3.26 Skill Renaming: flow-* → flowai-* (FR-26)

- **Description:** Rename all skill prefixes from `flow-` to `flowai-` for brand consistency.
- **Priority:** Medium (brand alignment, part of pack migration).
- **Acceptance:**
  - [x] **FR-26.1** All installed skills use `flowai-*` prefix in IDE config dirs. Evidence: `framework/*/skills/flowai-*` directories, `cli/src/sync_test.ts:47`, `cli/src/cli_test.ts`
  - [x] **FR-26.2** Pack directories use full installed names (`flowai-*` prefix). No name transformation at install time — flowai copies as-is. Evidence: `framework/*/skills/flowai-*` directories, `documents/design.md:55`
  - [x] **FR-26.3** ~~flowai adds prefix during sync~~ Rejected: decided to store full names in packs for simplicity (no translation logic needed). Evidence: `documents/design.md:55,194`

### 3.27 Reflection with Session History Search (FR-27)

- **Description:** Reflection skills (`flowai-reflect`) must search session history
  for similar errors/mistakes, identify patterns, and include findings in output.
- **Acceptance verified by benchmarks:** `flowai-reflect-session-history-pattern`, `flowai-reflect-context-inefficiency`, `flowai-reflect-process-loop`

### 3.28 CI/CD Pipeline Security (FR-28)

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-28.1 SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment. Evidence: `.github/workflows/ci.yml:18,24,98`
  - [ ] **FR-28.2 Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [ ] **FR-28.3 File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [ ] **FR-28.4 Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.

## 4. Non-functional requirements


- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based
  verification. Execution must be protected by timeouts (e.g., 60s per step) to
  ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes
  (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/flowai-commit`). Benchmark
  reports must be human-readable and provide actionable feedback via `trace.md`.

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
