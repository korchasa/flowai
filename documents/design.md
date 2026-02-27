# Software Design Specification (SDS)

## 1. Introduction

- **Document purpose:** Detail the implementation and architecture of the
  AI-First IDE Rules and Skills project.
- **Relation to SRS:** Implements requirements defined in
  `documents/requirements.md`.

## 2. System Architecture

- **Overview diagram:**
  ```mermaid
  graph TD
    Dev[.dev/ SPOT] -->|symlink| Cursor[.cursor/]
    Dev -->|symlink| Claude[.claude/]
    Dev -->|symlink| OpenCode[.opencode/]
    Cursor -->|skills, agents, hooks| IDE1[Cursor IDE]
    Claude -->|skills, agents| IDE2[Claude Code]
    OpenCode -->|skills, agents| IDE3[OpenCode]
    IDE1 & IDE2 & IDE3 -->|Updates| Docs[documents/*.md]
    IDE1 & IDE2 & IDE3 -->|Executes| Actions[Code/Git/MCP]
    Framework[framework/] -->|product skills| Users[End Users]
  ```
- **Main subsystems and their roles:**
  - **Dev Resources (`.dev/`):** IDE-agnostic SPOT for dev skills, agents, hooks. Symlinked to IDE directories via `deno task link`.
  - **Product Framework (`framework/`):** Source of truth for end-user skills/agents. Separate from dev resources.
  - **Skills Subsystem:** Defines procedural workflows and capabilities.
  - **Agents Subsystem:** Defines specialized agent roles and prompts.
  - **Benchmark Runner:** Specialist in executing and analyzing agent benchmarks.
  - **Documentation Subsystem:** Stores project state and memory.
  - **Link Manager (`scripts/task-link.ts`):** Creates/verifies symlinks from `.dev/` to IDE directories. Idempotent.

## 3. Components

### 3.1 Dev Resources (`.dev/`)

- **Purpose:** IDE-agnostic Single Point of Truth for all dev-time AI resources.
- **Structure:**
  - `.dev/skills/` — Dev skills (SKILL.md directories)
  - `.dev/agents/` — Dev agent definitions (Markdown files)
  - `.dev/hooks/` — Hook scripts (e.g., `logger.sh`)
  - `.dev/hooks.json` — Cursor hooks config
  - `.dev/worktrees.json` — Cursor worktrees config
- **Linking:** `deno task link` creates symlinks to IDE directories:
  - `.cursor/skills`, `.claude/skills`, `.opencode/skills` -> `.dev/skills`
  - `.cursor/agents`, `.claude/agents`, `.opencode/agents` -> `.dev/agents`
  - `.cursor/hooks` -> `.dev/hooks` (Cursor-only)
  - `.cursor/hooks.json` -> `.dev/hooks.json` (Cursor-only)
  - `.cursor/worktrees.json` -> `.dev/worktrees.json` (Cursor-only)
- **Constraints:** Claude Code write operations destroy symlinks (known bug). Dev skills are read-only — acceptable risk.

### 3.1.1 Product Skills (`framework/skills/`)

- **Purpose:** Provide specialized capabilities and workflows for end users.
- **Interfaces:** Directories containing `SKILL.md` files.
- **Categories:**
  - `flow-*`: Command-like skills (e.g., `flow-maintenance`, `flow-commit`).
  - `flow-skill-*`: Practical guides (e.g., `flow-skill-fix-tests`).
  - `rules-*`: Behavioral frameworks (e.g., `rules-tdd`).
  - `flow-skill-deno-*`: Deno-specific tools (`flow-skill-deno-cli`, `flow-skill-deno-deploy`).
- **Composition**: Skills can delegate to other skills (e.g., `flow-init` delegates development command configuration to `flow-skill-configure-*-commands`).

### 3.2 Product Agents (`framework/agents/{ide}/`)

- **Purpose:** Define specialized AI subagent personas and roles for end users.
- **Structure:** Per-IDE subdirectories: `framework/agents/claude/`, `framework/agents/cursor/`, `framework/agents/opencode/`.
  Each IDE has its own frontmatter format; body (system prompt) is shared.
- **IDE Frontmatter Differences:**
  - **Claude Code:** `name`, `description` (req), `tools` (list: Read, Grep, etc.), `disallowedTools`, `model` (sonnet/opus/haiku/inherit).
  - **Cursor:** `name`, `description` (req), `model` (inherit/fast/slow), `readonly` (bool).
  - **OpenCode:** `description` (req), `mode: subagent`, `model` (provider/model-id), `tools` (map: write/edit/bash→bool). Filename = agent name.
- **Key Agents (4, each in 3 IDE variants = 12 files):**
  - `deep-research-worker.md`: Research worker for a single direction within a deep research task; spawned by `flow-skill-deep-research` orchestrator.
  - `flow-console-expert.md`: Specialist in executing complex console tasks without modifying code.
  - `flow-diff-specialist.md`: Specialist in analyzing git diffs and planning atomic commits.
  - `flow-skill-executor.md`: Specialist in executing any prompt or task or specific skills.
- **Validation:** `scripts/check-agents.ts` (part of `deno task check`) verifies:
  - Completeness (same files across all IDE subdirs)
  - Body sync (system prompt identical across variants)
  - Description sync
  - IDE-specific frontmatter correctness (required/forbidden fields)

### 3.3 Project Documentation (`documents/`)

...

### 3.4 User Management System (Refactored)

- **Purpose:** Manage user lifecycle with separated concerns.
- **Components:**
  - `UserManager`: Orchestrates the user creation/deletion process.
  - `UserRepository`: Handles JSON file persistence.
  - `EmailService`: Handles sending notifications.
  - `Logger`: Handles application logging.
  - `UserValidator`: Handles input validation.

- **Interfaces:**
  - `User`: `{ id: number, name: string, email: string }`

- **Proposed Structure:**
  - `src/UserManager.ts` (Orchestrator)
  - `src/UserRepository.ts` (Data Access)
  - `src/EmailService.ts` (Notifications)
  - `src/Logger.ts` (Logging)
  - `src/UserValidator.ts` (Validation)
  - `src/types.ts` (Common types)

- **Maintenance & Benchmarking**:
  - `deno task bench`: Evaluates agents via evidence-based scenarios. Supports direct model selection via `-m, --model` flag.
  - **Parallel Execution Protection**: Uses `benchmarks/benchmarks.lock` file containing the PID to prevent concurrent runs. Implements signal listeners (`SIGINT`, `SIGTERM`) and `unload` events for reliable cleanup.
  - **Isolation**: Benchmarks run in isolated sandboxes using `SpawnedAgent` (direct `Deno.Command` based).
  - **Docker**: Optional Docker isolation (`Dockerfile` based on `denoland/deno:alpine`) with `git`, `bash`, `curl`, and `cursor-agent` installed.
  - **Hierarchical Scenarios**: Scenarios are organized as `benchmarks/<skill>/scenarios/<scenario>/mod.ts`.
  - **JSON Configuration**: `benchmarks/config.json` stores unified model presets.
  - **Direct Model Support**: If a preset is not found, the system uses the provided name as the model identifier with default settings (temperature: 0).
  - **Side-Effect Validation**: System checks sandbox state (files, git) using LLM-Judge.
  - **Execution Stability**: Implements a 60-second step timeout in `SpawnedAgent` to prevent infinite hangs during benchmark execution.
  - **Usage Calculation**: Automatically calculates token usage (input, output, cache read/write) based on session transcripts using `calculateSessionUsage`.
  - **Realistic Context**: `system-prompt-generator.ts` assembles system prompts using `system-prompt.template.md`, simulating Cursor's context (including dynamic project layout, git status, and user query).
  - **Single-Turn Query**: User query is embedded directly into the system prompt's `<user_query>` section, mimicking a single-turn interaction for benchmarks.
  - **Skill Integration**: Automatically includes all skills from `.cursor/skills` (excluding those with `disable-model-invocation: true`).
  - **Rich Tracing**: Generates `trace.html` with step-by-step timeline, syntax highlighting, and floating navigation.
  - **Unified Data UI**: All technical data (logs, scripts, prompts) use a consistent `.data-block` component with line numbers, word wrap, and smart expand/collapse.
  - **Interactive Flows**: `SimulatedUser` component handles multi-turn interactions by simulating user responses via LLM.
  - **Multi-Turn Benchmarking**: `SpawnedAgent` and `runner.ts` support automatic session resumption (`--resume`) when `SimulatedUser` provides input, enabling testing of complex interactive workflows.

### 3.5 Global Installer (`scripts/install.ts`) — FR-10

- **Purpose:** Install/update AssistFlow framework globally into IDE config dirs.
- **Strategy:** Per-item symlinks (each agent file, each skill dir) instead of
  single directory symlink. Preserves user's custom agents/skills.
- **IDE Detection:** Checks existence of `~/.cursor/`, `~/.claude/`, `~/.config/opencode/`.
- **Agent Discovery:** Per-IDE — reads from `framework/agents/{agentSubdir}/` (claude/cursor/opencode).
  Each IDE gets agent files with IDE-native frontmatter format.
- **Execution modes:**
  - **Local:** `deno task install` — uses `framework/` relative to script location.
  - **Remote:** `deno run -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts`
    — auto-detects remote context via `import.meta.url`, clones repo to `~/.assistflow/`
    (`git clone --depth=1`), uses `~/.assistflow/framework/` as source.
  - **Update:** `--update` / `-u` flag — runs `git pull --rebase` in `~/.assistflow/`,
    then re-plans symlinks.
- **Operations:**
  - Create `<ide-config>/agents/<name>.md` -> `<framework>/agents/<ide>/<name>.md`
  - Create `<ide-config>/skills/<name>/` -> `<framework>/skills/<name>/`
  - Replace broken parent directory symlinks with real directories.
  - Remove stale symlinks pointing to non-existent framework items.
  - Skip non-symlink files (warn user).
- **Bootstrap:** `install.sh` — thin shell script that installs Deno if absent,
  then delegates to `install.ts` via remote URL.
- **Managed directory:** `~/.assistflow/` — shallow git clone, source for symlinks.
- **Deps:** None (Deno std only, git for remote mode).

### 3.6 Conventional Commits `agent:` Type — FR-11

- **Purpose:** Dedicated commit type for AI agent/skill configuration changes.
- **Integration point:** `flow-commit` SKILL.md — added to recognized types list.
- **Auto-detection logic:** If all staged files match patterns
  (`framework/agents/**`, `framework/skills/**`, `.dev/agents/**`, `.dev/skills/**`,
  `AGENTS.md`, `<ide-dir>/agents/**`, `<ide-dir>/skills/**`) -> suggest `agent:` type.
- **Affected components:** `flow-commit` SKILL.md, `flow-diff-specialist` agent.

### 3.7 flow-init Multi-File Architecture + Diff-Based Updates — FR-12

- **Purpose:** Preserve user edits during re-initialization. Eliminate monolithic
  AGENTS.md. Enable agent-driven file generation.
- **Architecture:** 3 AGENTS.md files:
  - `./AGENTS.md` — core agent rules, project metadata, planning rules, TDD flow.
  - `./documents/AGENTS.md` — documentation system rules (SRS/SDS/GODS formats).
  - `./scripts/AGENTS.md` — development commands (standard interface, detected commands).
- **Generation approach:** Agent reads template files from `assets/` as reference
  and writes files directly. No manifest or script-driven rendering.
- **Brownfield extraction:** Agent semantically identifies documentation and
  script sections in existing `./AGENTS.md`, extracts them to subdirectory files,
  and removes duplicates from root. Templates are fallbacks for greenfield only.
- **Preservation:** User's custom project rules preserved. Extracted content takes
  priority over template content.
- **Diff-based update:** Agent shows diff per file, asks user for confirmation.
- **Documents guard:** Skip existing files exceeding line thresholds (50 for SRS/SDS, 10 for whiteboard).
- **Script:** `generate_agents.ts` (Deno/TS) — analyze-only. Command: `analyze`.
  Template rendering removed; agent handles generation natively.
- **IDE compat:** Cursor, Claude Code support subdir AGENTS.md natively.
  OpenCode needs `opencode.json` glob workaround (agent checks and warns).
- **Deps:** Deno std (`@std/path`, `@std/fs`).

### 3.8 Python-to-Deno Migration — FR-13

- **Purpose:** Eliminate Python runtime dependency by rewriting all 12 `.py` scripts
  to TypeScript (Deno).
- **Approach:** 1:1 behavioral parity. Same stdin/stdout/exit-code contracts.
- **Script categories:**
  - **Analyzers** (`analyze_project`, `count_tokens`): File system inspection, JSON output.
  - **Generators** (`generate_agents`, `init_*`): Template expansion, file scaffolding.
  - **Validators** (`validate_*.py`): YAML/Markdown parsing, error reporting.
  - **Packagers** (`package_*.py`): Bundling skill/command directories.
- **Test strategy:** Each `.ts` script gets a `_test.ts` file verifying identical
  output against known fixtures.
- **SKILL.md updates:** All `python3 scripts/*.py` invocations replaced with
  `deno run -A scripts/*.ts`.

## 4. Data and Storage

- **Entities and attributes:**
  - **Skill:** Name, Content, Path.
  - **Agent:** Name, Prompt, Capabilities.
- **ER diagram:** N/A (File-based storage).
- **Migration policies:** Manual updates via git.

## 5. Algorithms and Logic

- **Key algorithms:**
  - **Skill Matching:** IDE/Agent matches user intent to available skills.
  - **Agent Selection:** IDE/Agent selects appropriate agents based on task.
- **Business rules:**
  - Documentation must be kept up-to-date with code changes.
  - Code changes must follow defined style rules.

## 6. Non-functional Aspects

- **Scalability:** Modular file structure allows easy addition of new skills and
  agents.
- **Fault tolerance:** Text-based instructions are robust.
- **Security:** Skills are local to the project.
- **Monitoring and logging:** Git history tracks changes.

## 7. Constraints and Trade-offs

- **Simplified:** No centralized database; relies on file system.
- **Deferred:** Automated regression testing of skills.

## 8. Future Extensions

- Hook format transformation — now tracked as FR-14 in SRS (cross-IDE hook/plugin format transformation).
