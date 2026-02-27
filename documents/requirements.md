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
  - **SPOT:** Single Point of Truth (`.dev/` directory for dev resources).

## 2. General description

- **System context:** A set of configuration files (`.md`, SKILL.md) stored in
  `.dev/` (SPOT) and symlinked to IDE-specific directories (`.cursor/`, `.claude/`,
  `.opencode/`). Interpreted by AI agents in supported IDEs.
- **Assumptions and constraints:**
  - **Assumptions:** Developer uses one of: Cursor, Claude Code, or OpenCode.
    macOS/Linux environment. `deno task link` run after clone.
  - **Constraints:** Symlink-based distribution; Claude Code write ops may break
    symlinks (known bug). Agent's context window limits apply.
    Hook/plugin systems differ per IDE (Cursor hooks, Claude Code hooks with
    17+ events, OpenCode plugins) — format transformation needed.

## 3. Functional requirements

### 3.1 Command Execution (FR-1)

- **Description:** The system must provide executable workflows for common
  development tasks, accessible via chat commands.
- **Use case scenario:** User types `/commit` to start a commit workflow. Agent
  reads the command file and follows the steps.
- **Acceptance criteria:**
  - [x] Support for task commands including planning, execution, investigation,
        and documentation
  - [x] Commands follow `/<command>` naming convention (file name without
        `task-` prefix)
  - [x] Each command provides guided workflow with checklist
  - [x] flow-init configures development commands via specialized skills (see FR-8)

### 3.2 Rule Enforcement (FR-2)

- **Description:** The system must automatically apply development rules and
  coding standards.
- **Use case scenario:** Agent writes code. The system provides context on
  coding style (e.g., TypeScript, Swift) and principles (e.g., Zen, TDD).
- **Acceptance criteria:**
  - [x] Code style rules (TS, Swift, etc.).
  - [x] Development principles (Autonomous, Zen, TDD).
  - [x] Documentation standards.
  - [x] Translation of all project documentation and benchmarks README to English.

### 3.3 Documentation Management (FR-3)

- **Description:** The system must define and enforce documentation schemas to
  maintain project knowledge.
- **Use case scenario:** Agent updates project documentation. The system ensures
  it follows the RDS-SDS or Cline-bank schema.
- **Acceptance criteria:**
  - [x] Support for different documentation schemas.
  - [x] Instructions for compact documentation.

### 3.4 Automation & How-To (FR-4)

- **Description:** The system must provide guides for complex or situational
  tasks.
- **Use case scenario:** User asks how to fix tests. Agent retrieves
  `flow-skill-fix-tests/SKILL.md` and follows the procedure.
- **Acceptance criteria:**
  - [x] Support for 20 how-to guides covering QA, testing, diagrams, prompts,
        GitHub management, Deno tooling, research, benchmarks, and documentation
  - [x] Guides follow `flow-skill-*/` directory naming convention with `SKILL.md`
        files
  - [x] Each guide provides step-by-step instructions for specific scenarios

### 3.5 Project Maintenance (FR-5)

- **Description:** The system must provide automated project maintenance
  capabilities through scripts.
- **Use case scenario:** Developer runs `deno task check` to validate project
  integrity. Tasks perform linting, testing, and other checks.
- **Acceptance criteria:**
  - [x] Deno tasks configured in `deno.json`
  - [x] Task scripts stored in `./scripts/` and invoked via `deno task`
  - [x] Support for check, test, and dev commands
  - [x] Automated quality assurance workflows
  - [x] Development commands are set up during project initialization (see FR-8)

### 3.6 Developer Onboarding & Workflow Clarity (FR-6)

- **Description:** The project's `README.md` must provide clear, actionable
  instructions for developers on when and how to use the available tools.
- **Use case scenario:** A new developer joins the project and reads the
  `README.md` to understand the workflow for starting the project, implementing
  a task, and performing periodic maintenance.
- **Acceptance criteria:**
  - [x] Instructions for project initialization and environment verification.
  - [x] Step-by-step workflow for task implementation (Plan -> Execute -> Verify
        -> Commit).
  - [x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent
        Updates).
  - [x] Guidance for specific cases (Investigate, Answer, Engineer).

### 3.7 Benchmarking (FR-7)

- **Description:** The system must provide an evidence-based benchmarking system to
  evaluate agent performance objectively.
- **Use case scenario:** Developer runs `deno task bench` to see how well the
  agent handles specific scenarios.
- **Acceptance criteria:**
- [x] Isolated sandbox execution for scenarios using `SpawnedAgent` (direct `Deno.Command` based).
- [x] Evidence collection (git status, logs, file changes).
- [x] LLM-based Judge for semantic verification.
- [x] Financial cost calculation per scenario and per run.
- [x] Detailed token usage breakdown (Input, Output, Cache Read, Cache Write).
- [x] **Parallel Execution Protection**: Prevents multiple benchmark processes from running simultaneously using a lock file (`benchmarks/benchmarks.lock`).
- [x] Meaningful metrics: Errors, Warnings, Steps, Time, and Cost.
- [x] Rich HTML tracing with step-by-step timeline and syntax highlighting.
- [x] Unified data block UI with smart blur, line numbering, and word wrap.
- [x] JSON-based configuration for model presets (agent and judge).
  - [x] **Support for direct model names**: Allows using model names directly if no preset matches.
  - [x] **Simplified Model Selection**: Replaced presets with direct model selection in `deno task bench` via `-m, --model` flag.
  - [x] **Native Context Discovery**: Benchmarks rely on `cursor-agent`'s native context discovery by ensuring the sandbox structure mimics a real project (including `.cursor/` folder).
- [x] **Agent Under Test**: Benchmarks execute the `cursor-agent` binary in headless CLI mode within a dedicated sandbox environment, with interaction via standard input/output and arguments (e.g., `--resume` for multi-turn conversations).
- [x] **Single-Turn Benchmark**: User query is embedded in the system prompt to simulate real-world single-turn agent invocation.
- [x] **Mandatory AGENTS.md**: Every scenario must have an `AGENTS.md` file in its
      fixtures or provided via config.
- [x] **Secure Execution**: Benchmarks run in an isolated environment (Docker or local process).
- [x] **Simulated User**: Support for interactive flows via `SimulatedUser` LLM.
- [x] **Environment Management**: `.env` support for API keys in benchmarks.

### 3.8 Component Coverage Matrix

The benchmarking system must cover all core AssistFlow components to ensure reliability across all workflows.

#### Skills (`framework/skills/`)

| Skill ID                                   | Description                          | Benchmarked | Scenario ID              |
| :----------------------------------------- | :----------------------------------- | :---------: | :----------------------- |
| **Commands (`flow-*`)**                    |                                      |             |                          |
| `flow-answer`                              | Answering user questions             |     [ ]     |                          |
| `flow-commit`                              | Atomic commits and QA                |     [x]     | `flow-commit-*`          |
| `flow-engineer-command`                    | Creating new AF commands             |     [ ]     |                          |
| `flow-engineer-hook`                       | Creating hooks                       |     [ ]     |                          |
| `flow-engineer-rule`                       | Creating rules                       |     [ ]     |                          |
| `flow-engineer-skill`                      | Creating skills                      |     [ ]     |                          |
| `flow-engineer-subagent`                   | Creating subagents                   |     [ ]     |                          |
| `flow-init`                                | Project initialization               |     [x]     | `flow-init-*`            |
| `flow-investigate`                         | Code investigation/debugging         |     [ ]     |                          |
| `flow-maintenance`                         | Periodic project health checks       |     [ ]     |                          |
| `flow-plan`                                | Task planning (GODS)                 |     [x]     | `flow-plan-*`            |
| `flow-qa`                                  | Quality assurance session            |     [ ]     |                          |
| `flow-reflect`                             | Self-reflection on task              |     [x]     | `flow-reflect-*`         |
| `flow-setup-code-style-ts-deno`            | Setup Deno/TS code style             |     [ ]     |                          |
| `flow-setup-code-style-ts-strict`          | Setup strict TypeScript              |     [ ]     |                          |
| **Skills (`flow-skill-*`)**                |                                      |             |                          |
| `flow-skill-ai-skel-ts`                   | AI agent scaffold                    |     [ ]     |                          |
| `flow-skill-analyze-context`              | Analyze token usage in context       |     [x]     |                          |
| `flow-skill-conduct-qa-session`           | Conducting QA sessions               |     [ ]     |                          |
| `flow-skill-configure-deno-commands`      | Configure Deno development commands  |     [ ]     |                          |
| `flow-skill-cursor-agent-integration`     | Integration with cursor-agent CLI    |     [x]     |                          |
| `flow-skill-deep-research`                | Multi-directional web-based research |     [ ]     |                          |
| `flow-skill-deno-cli`                     | Manage Deno via CLI                  |     [ ]     |                          |
| `flow-skill-deno-deploy`                  | Manage Deno Deploy                   |     [ ]     |                          |
| `flow-skill-draw-mermaid-diagrams`        | Drawing Mermaid diagrams             |     [ ]     |                          |
| `flow-skill-engineer-prompts-for-instant` | Prompt engineering (Instant models)  |     [ ]     |                          |
| `flow-skill-engineer-prompts-for-reasoning` | Prompt engineering (Reasoning models) | [ ]     |                          |
| `flow-skill-fix-tests`                    | Fixing broken tests                  |     [ ]     |                          |
| `flow-skill-manage-github-tickets-by-mcp` | Managing GitHub via MCP              |     [ ]     |                          |
| `flow-skill-playwright-cli`               | Browser automation via CLI           |     [ ]     |                          |
| `flow-skill-write-agent-benchmarks`       | Writing agent benchmarks             |     [x]     |                          |
| `flow-skill-write-dep`                    | Writing DEP documents                |     [ ]     |                          |
| `flow-skill-write-gods-tasks`             | Writing GODS tasks                   |     [ ]     |                          |
| `flow-skill-write-in-informational-style` | Writing in info style                |     [ ]     |                          |
| `flow-skill-write-prd`                    | Writing PRDs                         |     [ ]     |                          |

#### Agents (`framework/agents/{claude,cursor,opencode}/`)

Per-IDE subdirectories with IDE-native frontmatter. Body (system prompt) shared.

| Agent ID                | Description                              | Benchmarked | Scenario ID |
| :---------------------- | :--------------------------------------- | :---------: | :---------- |
| `deep-research-worker`  | Single-direction research worker         |     [ ]     |             |
| `flow-console-expert`   | Complex console tasks without code edits |     [ ]     |             |
| `flow-diff-specialist`  | Analyze git diffs and plan commits       |     [ ]     |             |
| `flow-skill-executor`   | Execute specific skills or prompts       |     [ ]     |             |

### 3.8 Project Initialization — flow-init (FR-8)

- **Description:** The `flow-init` skill bootstraps AI agent understanding of a project by analyzing codebase, generating `AGENTS.md`, and scaffolding documentation.
- **Use case scenario:** User runs `/flow-init` on existing or new project. Agent analyzes codebase, determines project type, interviews user if needed, and generates missing documentation.
- **Acceptance criteria:**
  - [ ] **FR-8.1 Agent-driven Greenfield/Brownfield detection**: The analysis script (`analyze_project.py`) must NOT output `is_new` flag. The agent determines Greenfield vs Brownfield based on script output (file count, stack, file tree) and its own judgment.
  - [ ] **FR-8.2 Scripts are read-only**: Scripts (`analyze_project.py`, `generate_agents.py`) must NOT create, write, or modify any files. Scripts only analyze and output data (JSON to stdout). All file creation is the agent's responsibility.
  - [ ] **FR-8.3 No rule copying**: The initialization process must NOT copy rules to `.cursor/rules/`. Rule management is outside flow-init scope.
  - [ ] **FR-8.4 Auto-generation of missing documentation**: If `AGENTS.md` or `documents/` (SRS, SDS, whiteboard) are absent, the agent must generate them by analyzing existing code, configs, README, and project documentation. Not from templates with empty placeholders — from actual project content.
  - [ ] **FR-8.5 PoC mode detection and setup**: If `AGENTS.md` exists but contains no indication of PoC status, the agent must ask the user if the project is in Proof-of-Concept mode. If confirmed, the agent must add a clear PoC declaration and PoC working rules to `AGENTS.md` (see rules-poc reference: strict timebox, hypothesis validation, disposable code, security remains mandatory).
  - [ ] Greenfield workflow: interview user for vision, stack, architecture
  - [ ] Brownfield workflow: reverse-engineer architecture from codebase
  - [ ] Configure development commands via specialized skills (e.g., `flow-skill-configure-deno-commands`)
  - [ ] Idempotency: confirm before overwriting existing components
  - [ ] Cleanup temporary files after execution

### 3.9 Multi-IDE Dev Resource Distribution (FR-9)

- **Description:** Dev resources (skills, agents, hooks) must be stored in a single
  IDE-agnostic directory (`.dev/`) and distributed to IDE-specific directories via
  symlinks.
- **Use case scenario:** Developer clones project, runs `deno task link`, and all
  three IDEs (Cursor, Claude Code, OpenCode) discover the same skills and agents.
- **Acceptance criteria:**
  - [x] `.dev/` is SPOT for dev skills, agents, hooks, and IDE configs
  - [x] `deno task link` creates symlinks from `.dev/` to `.cursor/`, `.claude/`,
        `.opencode/` (skills and agents for all; hooks per-IDE where supported)
  - [x] `deno task link` is idempotent (safe to run multiple times)
  - [x] `deno task link` does not destroy existing real files (warns and skips)
  - [x] `deno task dev` runs `deno task link` on startup
  - [x] `check-skills.ts` validates `.dev/skills/` (not `.cursor/skills/`)
  - [x] `.gitignore` excludes symlink targets, includes `.dev/` source
  - [ ] Post-clone setup documented in README

### 3.10 Global Framework Install/Update (FR-10)

- **Description:** A script that installs or updates AssistFlow framework globally
  for supported IDEs. Each agent and skill is installed as an individual symlink,
  so framework updates do not overwrite user's own agents/skills in IDE config dirs.
- **Use case scenario:** Developer runs `deno run -A install.ts` (or a remote URL
  equivalent). The script detects installed IDEs, creates per-item symlinks for each
  framework agent and skill into the IDE config directories (`~/.cursor/`, `~/.claude/`,
  `~/.opencode/`). On re-run, it updates only framework-managed symlinks without
  touching user-created files.
- **Acceptance criteria:**
  - [x] **FR-10.1 Per-item symlinks**: Each agent file and each skill directory is
        symlinked individually (not a single directory symlink). This prevents
        overwriting user's custom agents/skills.
  - [x] **FR-10.2 Multi-IDE support**: Script detects and supports Cursor
        (`~/.cursor/`), Claude Code (`~/.claude/`), OpenCode (`~/.config/opencode/`).
        Agents are per-IDE: reads from `framework/agents/{claude,cursor,opencode}/`
        with IDE-native frontmatter format.
  - [x] **FR-10.3 Idempotent**: Safe to run multiple times. Existing symlinks are
        updated, non-symlink files are never overwritten (warn and skip).
  - [x] **FR-10.4 Install & update**: Same script handles both fresh install and
        update. Stale framework symlinks (pointing to removed framework items) are
        cleaned up. `--update` flag triggers `git pull` on existing clone.
  - [x] **FR-10.5 No user data loss**: User-created files/directories in IDE config
        dirs are never modified or removed.
  - [x] **FR-10.6 Remote execution**: Supports `deno run -A <url>` for one-liner
        install from repository. Auto-clones to `~/.assistflow/`. Shell bootstrap
        (`install.sh`) installs Deno if missing.
  - [x] **FR-10.7 Written in Deno/TypeScript**: No Python dependency.

### 3.11 Conventional Commits — `agent` Type (FR-11)

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention
  used by `flow-commit`. Covers changes to agents, skills, `AGENTS.md`, and other
  AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent
  definition. On commit, the message is prefixed with `agent:` (e.g.,
  `agent: update flow-commit skill with atomic grouping rules`).
- **Acceptance criteria:**
  - [ ] **FR-11.1 New type recognized**: `flow-commit` skill recognizes `agent:` as a
        valid Conventional Commits type.
  - [ ] **FR-11.2 Scope**: `agent:` type applies to changes in: `framework/agents/`,
        `framework/skills/`, `.dev/agents/`, `.dev/skills/`, `AGENTS.md`,
        IDE-specific agent/skill directories.
  - [ ] **FR-11.3 Auto-detection**: `flow-commit` automatically selects `agent:` type
        when staged changes are exclusively in agent/skill files.
  - [ ] **FR-11.4 Documentation**: The `agent:` type is documented in `flow-commit`
        SKILL.md and project conventions.

### 3.12 flow-init Idempotency with User Edit Preservation (FR-12)

- **Description:** `flow-init` must be fully idempotent: re-running on an already
  initialized project must preserve user's manual edits in `AGENTS.md` and other
  generated files. Framework-managed sections are updated; user-added sections are
  kept intact.
- **Use case scenario:** User runs `/flow-init` on a project that already has
  `AGENTS.md` with custom rules added by the user. The agent updates
  framework-generated sections (e.g., templates, stack info) but preserves all
  user-added content.
- **Acceptance criteria:**
  - [x] **FR-12.1 Multi-file architecture**: `AGENTS.md` split into 3 domain-scoped
        files: `./AGENTS.md` (core rules + project metadata), `./documents/AGENTS.md`
        (doc system rules), `./scripts/AGENTS.md` (dev commands). Agent reads templates
        from `assets/` and generates files directly (no manifest).
  - [x] **FR-12.2 No data loss**: In brownfield, agent semantically extracts
        documentation/script sections from existing `./AGENTS.md` into subdirectory
        files. Per-file diff shown before applying. User confirms each file individually.
  - [x] **FR-12.3 Documents preservation**: Existing files exceeding line thresholds
        (50 for SRS/SDS, 10 for whiteboard) are not overwritten.
  - [x] **FR-12.4 Diff-based update**: Agent shows diff per file, asks for confirmation.
  - [ ] **FR-12.5 Idempotent re-run**: Running `flow-init` twice in a row with no
        manual changes produces no modifications on the second run.
  - [x] **FR-12.6 Deno/TS scripts**: `generate_agents.ts` — analyze-only (Deno).
        Template rendering removed; agent handles generation natively.
  - [x] **FR-12.7 OpenCode compatibility**: Agent checks `opencode.json` for
        subdirectory AGENTS.md glob entries. Warns if missing.

### 3.13 Rewrite Python Scripts to Deno/TypeScript (FR-13)

- **Description:** All Python scripts bundled with framework skills must be rewritten
  in Deno/TypeScript. Eliminates Python runtime dependency for end users.
- **Use case scenario:** User installs AssistFlow framework. All scripts execute via
  `deno run` without requiring Python installation.
- **Acceptance criteria:**
  - [ ] **FR-13.1 Full migration**: All `.py` scripts in `framework/skills/` are
        replaced with equivalent `.ts` scripts.
  - [ ] **FR-13.2 Scripts to migrate** (12 files):
    - ~~`flow-init/scripts/analyze_project.py`~~ (migrated to `generate_agents.ts`)
    - ~~`flow-init/scripts/generate_agents.py`~~ (migrated to `generate_agents.ts`)
    - `flow-skill-analyze-context/scripts/count_tokens.py`
    - `flow-engineer-command/scripts/init_command.py`
    - `flow-engineer-command/scripts/package_command.py`
    - `flow-engineer-command/scripts/validate_command.py`
    - `flow-engineer-rule/scripts/validate_rule.py`
    - `flow-engineer-rule/scripts/init_rule.py`
    - `flow-engineer-skill/scripts/package_skill.py`
    - `flow-engineer-skill/scripts/init_skill.py`
    - `flow-engineer-skill/scripts/validate_skill.py`
    - `flow-skill-draw-mermaid-diagrams/scripts/validate.py`
  - [ ] **FR-13.3 Behavioral parity**: Each rewritten script produces identical
        output (stdout JSON, exit codes) as the Python original.
  - [ ] **FR-13.4 SKILL.md references updated**: All `SKILL.md` files referencing
        `python3 scripts/*.py` are updated to `deno run -A scripts/*.ts`.
  - [ ] **FR-13.5 No Python dependency**: After migration, `Python` is removed from
        the project tooling stack in `AGENTS.md`.
  - [ ] **FR-13.6 Tests**: Each rewritten script has unit tests.

### 3.14 Cross-IDE Hook/Plugin Format Transformation (FR-14)

- **Description:** All three supported IDEs now have hook/plugin systems with
  different formats: Cursor hooks (`.cursor/hooks/`), Claude Code hooks
  (`settings.json`, 17+ event types including `PreToolUse`, `PostToolUse`,
  `SubagentStart`, `SessionStart`, etc.), and OpenCode plugins
  (`.opencode/plugins/*.ts` with `tool()` helper and rich event API). The
  framework must support authoring hooks once and transforming them to
  IDE-native formats.
- **Use case scenario:** Developer defines a hook in `.dev/hooks/` (IDE-agnostic
  format). `deno task link` generates the correct format for each IDE:
  Cursor hook file, Claude Code `settings.json` entry, OpenCode plugin `.ts` file.
- **Acceptance criteria:**
  - [ ] **FR-14.1 Canonical format**: Define an IDE-agnostic hook/plugin format
        in `.dev/hooks/` (e.g., JSON or YAML).
  - [ ] **FR-14.2 Cursor output**: Transform to Cursor hook format.
  - [ ] **FR-14.3 Claude Code output**: Transform to Claude Code `settings.json`
        hooks section. Support all 17+ event types: `PreToolUse`, `PostToolUse`,
        `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`,
        `SessionStart`, `SessionEnd`, `PreCompact`, `WorktreeCreate`,
        `WorktreeRemove`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`,
        `Notification`, `PermissionRequest`.
  - [ ] **FR-14.4 OpenCode output**: Transform to OpenCode plugin `.ts` format
        using `tool()` helper and event subscriptions.
  - [ ] **FR-14.5 Hook types**: Support `command` (script-based), `prompt`
        (LLM-based), and `agent` (subagent-based) hook types where the target
        IDE supports them.

### 3.15 Update `flow-engineer-hook` for Cross-IDE Support (FR-15)

- **Description:** The `flow-engineer-hook` skill currently documents hook
  creation primarily for Cursor. It must be updated to cover Claude Code's
  expanded hook system (17+ events, three hook types: command/prompt/agent)
  and OpenCode's plugin system.
- **Use case scenario:** User asks to create a hook. The skill guides them
  through authoring for their target IDE, covering all available event types
  and hook mechanisms.
- **Acceptance criteria:**
  - [ ] **FR-15.1 Claude Code hooks**: Document all 17+ event types, three hook
        types (command, prompt, agent), and `settings.json` configuration.
  - [ ] **FR-15.2 OpenCode plugins**: Document `.opencode/plugins/*.ts` format,
        `tool()` helper, event API, and npm package distribution.
  - [ ] **FR-15.3 Cursor hooks**: Retain existing Cursor hook documentation.
  - [ ] **FR-15.4 Cross-IDE guidance**: Skill provides IDE-specific examples
        and notes which events/types are available per IDE.

### 3.16 Update `flow-engineer-command` for Claude Code Unification (FR-16)

- **Description:** Claude Code has unified commands and skills under a single
  namespace — `.claude/commands/` and `.claude/skills/` are now merged, with
  skills as the recommended format. The `flow-engineer-command` skill must
  reflect this change.
- **Use case scenario:** User asks to create a command for Claude Code. The skill
  informs them that Claude Code uses skills (SKILL.md) as the unified format
  and guides them accordingly.
- **Acceptance criteria:**
  - [ ] **FR-16.1 Documentation update**: `flow-engineer-command/SKILL.md` notes
        that Claude Code commands = skills (unified namespace).
  - [ ] **FR-16.2 IDE-specific guidance**: Skill provides correct path and format
        for each IDE (Cursor: `.cursor/commands/`, Claude Code: `.claude/skills/`,
        OpenCode: `.opencode/commands/`).
  - [ ] **FR-16.3 No breaking changes**: Existing command creation workflow for
        Cursor and OpenCode remains unchanged.

### 3.17 Resolve IDE Support Scope (FR-17)

- **Description:** Root `AGENTS.md` line 25 lists 5 IDEs (Cursor, Claude Code,
  Antigravity, OpenAI Codex, OpenCode) but all infrastructure (scripts, agent
  directories, install.ts) supports only 3 (Cursor, Claude Code, OpenCode).
  Several skill SKILL.md files and their Python scripts reference Codex and
  Antigravity paths. This inconsistency must be resolved.
- **Use case scenario:** A contributor reads AGENTS.md, expects Codex/Antigravity
  support, but finds no corresponding agent directories or install logic.
- **Acceptance criteria:**
  - [ ] **FR-17.1 Decision**: Explicitly decide whether Codex and Antigravity are
        supported, aspirational, or unsupported.
  - [x] **FR-17.2 AGENTS.md alignment**: Root `AGENTS.md` IDE list narrowed to
        3 supported IDEs (Cursor, Claude Code, OpenCode).
  - [ ] **FR-17.3 Skill references**: `flow-engineer-rule`, `flow-engineer-command`,
        `flow-engineer-skill` SKILL.md files and their scripts are updated to
        match the decided IDE scope.
  - [x] **FR-17.4 Design doc**: `design.md` replaced "Cursor" with generic
        "IDE/Agent" terminology in algorithms section.

## 4. Non-functional requirements


- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based
  verification. Execution must be protected by timeouts (e.g., 60s per step) to
  ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes
  (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/flow-commit`). Benchmark
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
  - Dev resources in `.dev/` are accessible from all three IDE directories via symlinks.
  - `deno task link` creates correct symlinks idempotently.
  - Documentation accurately reflects the project state.
