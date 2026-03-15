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
    Framework[framework/] -->|flowai cli/| Claude[.claude/]
    DevSkills[.claude/skills/ dev] -->|tracked in git| Claude
    Claude -->|skills, agents| IDE[Claude Code]
    IDE -->|Updates| Docs[documents/*.md]
    IDE -->|Executes| Actions[Code/Git/MCP]
    Framework -->|flowai| Users[End Users]
  ```
- **Main subsystems and their roles:**
  - **Product Framework (`framework/`):** Source of truth for end-user skills/agents. Distributed via flowai.
  - **Dev Resources (`.claude/skills/`, `.claude/agents/`):** Dev-only skills/agents tracked in git. Framework resources installed by flowai from remote.
  - **Skills Subsystem:** Defines procedural workflows and capabilities.
  - **Agents Subsystem:** Defines specialized agent roles and prompts.
  - **Benchmark Runner:** Specialist in executing and analyzing agent benchmarks.
  - **Documentation Subsystem:** Stores project state and memory.

## 3. Components

### 3.1 Dev Resources (`.claude/skills/`, `.claude/agents/`)

- **Purpose:** Dev-only skills and agents for AssistFlow development. Not distributed to users.
- **Structure:**
  - `.claude/skills/` — Dev skills (SKILL.md directories, tracked in git) + framework skills (installed by flowai)
  - `.claude/agents/` — Dev agents (tracked in git) + framework agents (installed by flowai)
- **Distribution:** flowai (`cli/`) installs framework resources from bundled source into `.claude/`.

### 3.1.1 Product Skills (`framework/skills/`)

- **Purpose:** Provide specialized capabilities and workflows for end users.
- **Interfaces:** Directories containing `SKILL.md` files.
- **Categories:**
  - `flow-*`: Command-like skills (e.g., `flow-maintenance`, `flow-commit`).
  - `flow-skill-*`: Practical guides (e.g., `flow-skill-fix-tests`).
  - `flow-skill-deno-*`: Deno-specific tools (`flow-skill-deno-cli`, `flow-skill-deno-deploy`).
- **Composition**: Skills can delegate to other skills (e.g., `flow-init` delegates development command configuration to `flow-skill-configure-*-commands`).
- **Script independence:** Scripts in `framework/skills/*/scripts/` are installed into user projects without a shared `deno.json`. They MUST be runnable standalone:
  - Use `jsr:` specifiers for Deno std imports (e.g., `jsr:@std/path`), NOT bare specifiers (`@std/path`).
  - Avoid dependencies requiring import maps or `deno.json` resolution.
  - Each script header MUST include a `Run:` section with the exact `deno run` command.

#### 3.1.2 Script Language Policy

All project scripts (both `framework/skills/*/scripts/` and root `scripts/`) use Deno/TypeScript exclusively. Python is not used in the project.

#### 3.1.3 Skill Tool Hints (`allowed-tools`)

Skills MAY use the `allowed-tools` frontmatter field (experimental, per agentskills.io spec) to pre-approve tools needed for script execution. Example:

```yaml
---
name: my-skill
description: Does something
allowed-tools: Bash(deno:*)
---
```

Adoption is optional. IDEs that support `allowed-tools` will auto-approve matching tool calls; IDEs that don't will ignore the field.

#### 3.1.4 Skill Name Collision Resolution

When a dev skill in `.claude/skills/` has the same name as a framework skill in `framework/skills/`, flowai will overwrite the dev version during sync. Dev skills should use unique names to avoid collisions.

### 3.2 Product Agents (`framework/agents/`)

- **Purpose:** Define specialized AI subagent personas and roles for end users.
- **Structure:** Flat directory `framework/agents/` with one canonical `.md` file per agent.
  Frontmatter contains universal superset of all IDE fields; body is the shared system prompt.
- **Canonical Format:** Universal frontmatter — superset of all IDE-specific fields:
  `name`, `description` (required), `tools` (string, Claude), `disallowedTools` (string, Claude),
  `readonly` (bool, Cursor), `mode` (string, OpenCode), `opencode_tools` (map, OpenCode).
  `flowai` extracts IDE-relevant fields at install time via `transformAgent()`.
- **Key Agents (4 canonical files):**
  - `deep-research-worker.md`: Research worker for a single direction within a deep research task; spawned by `flow-skill-deep-research` orchestrator.
  - `flow-console-expert.md`: Specialist in executing complex console tasks without modifying code.
  - `flow-diff-specialist.md`: Specialist in analyzing git diffs and planning atomic commits.
  - `flow-skill-executor.md`: Specialist in executing any prompt or task or specific skills.
- **Distribution:** `flowai` transforms canonical agents into IDE-specific format at install time.
- **Reference: IDE frontmatter formats** (transformation rules owned by flowai):
  - **Claude Code:** `name`, `description` (req), `tools` (list: Read, Grep, etc.), `disallowedTools`, `model` (sonnet/opus/haiku/inherit).
  - **Cursor:** `name`, `description` (req), `model` (inherit/fast/slow), `readonly` (bool).
  - **OpenCode:** `description` (req), `mode: subagent`, `model` (provider/model-id), `tools` (map: write/edit/bash→bool). Filename = agent name.

### 3.3 Project Documentation (`documents/`)

- **Purpose:** Persistent project memory across AI sessions. Single source of truth for requirements, architecture, and current plans.
- **Hierarchy:**
  1. `AGENTS.md` — project vision, constraints, mandatory rules (root-level, read-only reference).
  2. `documents/requirements.md` (SRS) — functional and non-functional requirements. Source of truth for "what" and "why".
  3. `documents/design.md` (SDS) — architecture and implementation details. Depends on SRS.
  4. `documents/whiteboard.md` — temporary plans and notes in GODS format. Cleaned up after task completion.
  5. `documents/ides-difference.md` — cross-IDE capability comparison (primitives, hooks, agents, MCP). Reference for FR-14–FR-17.
  6. `documents/benchmarking.md` — benchmark results and analysis.
- **Rules:**
  - Every `[x]` acceptance criterion in SRS must include file-path evidence.
  - English only (except whiteboard). Compressed style (no fluff, high-info words).
  - Agent reads docs at session start; outdated docs = wrong assumptions.
- **Deps:** None (plain Markdown files).

### 3.4 Benchmark System (`benchmarks/`, `scripts/benchmarks/`)

- **Purpose:** Evidence-based evaluation of AI agent skill execution quality.
- **Architecture:**
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

### 3.5 Global Framework Distribution — FR-10 (`cli/`)

- **Purpose:** Install/update AssistFlow framework skills/agents into project-local IDE config dirs.
- **Location:** `cli/` monorepo directory. Published to JSR as `@korchasa/flowai`.
- **Pattern:** Single-command CLI. Adapter pattern for FS isolation. Bundled source (no network at runtime).
- **Diagram:**
```mermaid
graph TD
    CLI[CLI Entry: flowai] --> ConfigLoader
    ConfigLoader -->|no .flowai.yaml| ConfigGenerator[Interactive Config Gen]
    ConfigLoader -->|has .flowai.yaml| SyncEngine
    ConfigGenerator --> SyncEngine
    SyncEngine --> BundledSrc[BundledSource: bundled.json]
    SyncEngine --> IdeDetector[IDE Detector]
    SyncEngine --> PlanEngine[Plan Engine]
    SyncEngine --> FileWriter[File Writer]
    BundledSrc -->|file listing + content| Memory[In-Memory Files]
    PlanEngine -->|create/update/conflict| FileWriter
    FileWriter --> FS[Project FS]
```
- **Components:**
  - `cli/src/cli.ts` — CLI entry, flags (`--yes`, `--skip-update-check`), @cliffy/command
  - `cli/src/config.ts` — `.flowai.yaml` parser/writer, validation (include/exclude mutual exclusivity)
  - `cli/src/config_generator.ts` — interactive config creation via @cliffy/prompt
  - `cli/src/source.ts` — `FrameworkSource` interface, `BundledSource` (reads `bundled.json`), `InMemoryFrameworkSource` (tests)
  - `cli/src/sync.ts` — orchestrates: load bundle → filter skills/agents → compute plan → write files → symlinks
  - `cli/src/plan.ts` — compares upstream vs local (create/ok/conflict classification)
  - `cli/src/writer.ts` — writes plan items to IDE config dirs
  - `cli/src/transform.ts` — transforms universal agent frontmatter into IDE-specific format
  - `cli/src/ide.ts` — IDE detection by config dir presence
  - `cli/src/symlinks.ts` — `CLAUDE.md -> AGENTS.md` symlinks (FR-10.4)
  - `cli/src/version.ts` — self-update check against JSR registry (fail-open)
  - `cli/src/adapters/fs.ts` — `FsAdapter` abstraction + `DenoFsAdapter` + `InMemoryFsAdapter`
  - `cli/scripts/bundle-framework.ts` — generates `src/bundled.json` from `../framework/`
- **Data entities:**
  - `FlowConfig`: `{ version, ides, skills: {include, exclude}, agents: {include, exclude} }`
  - `PlanItem`: `{ type: skill|agent, name, action: create|update|ok|conflict, sourcePath, targetPath, content }`
- **Agent transformation rules** (per IDE):
  - Claude: `name`, `description`, `tools`, `disallowedTools`
  - Cursor: `name`, `description`, `readonly`
  - OpenCode: `description`, `mode`; `opencode_tools` → `tools`
- **Distribution:** JSR via `deno publish`. `bundled.json` generated at publish time. No build step for TS.

### 3.6 Conventional Commits `agent:` Type — FR-11

- **Purpose:** Dedicated commit type for AI agent/skill configuration changes.
- **Integration point:** `flow-commit` SKILL.md — added to recognized types list.
- **Auto-detection logic:** If all staged files match patterns
  (`framework/agents/**`, `framework/skills/**`, `.claude/agents/**`, `.claude/skills/**`,
  `AGENTS.md`) -> suggest `agent:` type.
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
- **Deps:** Deno std via `jsr:` specifiers (`jsr:@std/path`). No bare specifiers.

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

### 3.9 AI Devcontainer Setup — FR-20

- **Purpose:** Generate `.devcontainer/` config optimized for AI IDE development.
- **Architecture:** 7-step skill workflow (detect stack → discover features → detect
  existing → determine capabilities → generate → write → verify). 4 reference docs
  (`devcontainer-template`, `features-catalog`, `dockerfile-patterns`, `firewall-template`).
- **Stack detection:** Scans project root for indicator files (`deno.json`,
  `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Maps to MCR base images.
  Multi-stack → user picks primary, secondary added as features.
- **Feature discovery:** Indicator→need mapping in `references/features-catalog.md`.
  Categories: secondary runtimes (auto), build tools (auto), infra/cloud (suggest),
  databases (suggest), testing (suggest). Always includes `common-utils` + `github-cli`.
- **AI CLI support:** 4 CLIs via registry features (Claude Code, OpenCode, Cursor CLI,
  Gemini CLI). Config persistence via Docker volumes. Global skills via read-only bind
  mount to `*-host` path + `postStartCommand` sync with `cp -rL` (dereferences symlinks).
- **Security hardening:** Optional `init-firewall.sh` with default-deny iptables +
  stack-aware domain allowlist. Requires `NET_ADMIN`/`NET_RAW` capabilities + custom
  Dockerfile.
- **Idempotency:** Detects existing `.devcontainer/`, shows diff, asks per-file
  confirmation.
- **Integration:** Invoked standalone or delegated from `flow-init` step 11.
- **Deps:** None (pure SKILL.md, agent-driven generation).

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
