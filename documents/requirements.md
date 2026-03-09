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
        review, and documentation. Evidence: `framework/skills/flow-plan/SKILL.md:9`,
        `framework/skills/flow-commit/SKILL.md:7`,
        `framework/skills/flow-review/SKILL.md:7`,
        `framework/skills/flow-investigate/SKILL.md:7`,
        `framework/skills/flow-answer/SKILL.md:9`
  - [x] Commands follow `/<command>` naming convention (file name without
        `task-` prefix). Evidence: `framework/skills/flow-plan/SKILL.md:2`,
        `framework/skills/flow-commit/SKILL.md:2`,
        `framework/skills/flow-investigate/SKILL.md:2`
  - [x] Each command provides guided workflow with checklist. Evidence:
        `framework/skills/flow-plan/SKILL.md:36-63`,
        `framework/skills/flow-commit/SKILL.md:54-97`
  - [x] flow-init configures development commands via specialized skills (see FR-8).
        Evidence: `framework/skills/flow-init/SKILL.md` step 10 "Configure Development Commands"

### 3.2 Rule Enforcement (FR-2)

- **Description:** The system must automatically apply development rules and
  coding standards.
- **Use case scenario:** Agent writes code. The system provides context on
  coding style (e.g., TypeScript, Swift) and principles (e.g., Zen, TDD).
- **Acceptance criteria:**
  - [x] Code style rules (TS, Swift, etc.). Evidence:
        `framework/skills/flow-setup-code-style-ts-deno/SKILL.md:17-35`,
        `framework/skills/flow-setup-code-style-ts-strict/SKILL.md:17-105`
  - [x] Development principles (Autonomous, Zen, TDD). Evidence:
        `AGENTS.md:92-105`, `AGENTS.md:1-20`
  - [x] Documentation standards. Evidence: `documents/AGENTS.md:1-127`,
        `AGENTS.md:87-90`
  - [x] Translation of all project documentation and benchmarks README to English.
        Evidence: `AGENTS.md:9`, `documents/AGENTS.md:119`

### 3.3 Documentation Management (FR-3)

- **Description:** The system must define and enforce documentation schemas to
  maintain project knowledge.
- **Use case scenario:** Agent updates project documentation. The system ensures
  it follows the RDS-SDS or Cline-bank schema.
- **Acceptance criteria:**
  - [x] Support for different documentation schemas. Evidence:
        `documents/AGENTS.md:21-49` (SRS), `documents/AGENTS.md:50-76` (SDS)
  - [x] Instructions for compact documentation. Evidence:
        `documents/AGENTS.md:116-127`

### 3.4 Automation & How-To (FR-4)

- **Description:** The system must provide guides for complex or situational
  tasks.
- **Use case scenario:** User asks how to fix tests. Agent retrieves
  `flow-skill-fix-tests/SKILL.md` and follows the procedure.
- **Acceptance criteria:**
  - [x] Support for 19 how-to guides covering QA, testing, diagrams, prompts,
        GitHub management, Deno tooling, research, benchmarks, and documentation.
        Evidence: `framework/skills/flow-skill-*/SKILL.md` (19 directories)
  - [x] Guides follow `flow-skill-*/` directory naming convention with `SKILL.md`
        files. Evidence: `framework/skills/flow-skill-conduct-qa-session/SKILL.md`,
        `framework/skills/flow-skill-draw-mermaid-diagrams/SKILL.md`,
        `framework/skills/flow-skill-deep-research/SKILL.md`
  - [x] Each guide provides step-by-step instructions for specific scenarios.
        Evidence: `framework/skills/flow-skill-draw-mermaid-diagrams/SKILL.md:8-16`,
        `framework/skills/flow-skill-deep-research/SKILL.md:28-210`

### 3.5 Project Maintenance (FR-5)

- **Description:** The system must provide automated project maintenance
  capabilities through scripts.
- **Use case scenario:** Developer runs `deno task check` to validate project
  integrity. Tasks perform linting, testing, and other checks.
- **Acceptance criteria:**
  - [x] Deno tasks configured in `deno.json`. Evidence: `deno.json:11-18`
  - [x] Task scripts stored in `./scripts/` and invoked via `deno task`. Evidence:
        `scripts/task-check.ts`, `scripts/task-test.ts`, `scripts/task-dev.ts`,
        `deno.json:12-17`
  - [x] Support for check, test, and dev commands. Evidence: `deno.json:12-14`
  - [x] Automated quality assurance workflows. Evidence:
        `framework/skills/flow-review/SKILL.md:56-140`
  - [x] Development commands are set up during project initialization (see FR-8).
        Evidence: `framework/skills/flow-init/SKILL.md` step 10 "Configure Development Commands"

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

- **Description:** The system must provide an evidence-based benchmarking system to
  evaluate agent performance objectively.
- **Use case scenario:** Developer runs `deno task bench` to see how well the
  agent handles specific scenarios.
- **Acceptance criteria:**
- [x] Isolated sandbox execution for scenarios using `SpawnedAgent` (direct `Deno.Command` based).
      Evidence: `scripts/benchmarks/lib/spawned_agent.ts:32`,
      `scripts/benchmarks/lib/runner.ts:28-38`
- [x] Evidence collection (git status, logs, file changes). Evidence:
      `scripts/benchmarks/lib/runner.ts:286-330`,
      `scripts/benchmarks/lib/trace.ts:984-996`
- [x] LLM-based Judge for semantic verification. Evidence:
      `scripts/benchmarks/lib/judge.ts:4-124`,
      `scripts/benchmarks/lib/runner.ts:332-340`
- [x] Financial cost calculation per scenario and per run. Evidence:
      `scripts/benchmarks/lib/types.ts:117`,
      `scripts/task-bench.ts:163-178`, `scripts/task-bench.ts:304-306`
- [x] Detailed token usage breakdown (Input, Output, Cache Read, Cache Write).
      Evidence: `scripts/benchmarks/lib/usage.ts:4-16`,
      `scripts/benchmarks/lib/usage.ts:54-141`,
      `scripts/benchmarks/lib/runner.ts:267-275`
- [x] **Parallel Execution Protection**: Prevents multiple benchmark processes from
      running simultaneously using a lock file (`benchmarks/benchmarks.lock`).
      Evidence: `scripts/task-bench.ts:63-92`
- [x] Meaningful metrics: Errors, Warnings, Steps, Time, and Cost. Evidence:
      `scripts/benchmarks/lib/types.ts:103-123`,
      `scripts/task-bench.ts:261-324`
- [x] Rich HTML tracing with step-by-step timeline and syntax highlighting. Evidence:
      `scripts/benchmarks/lib/trace.ts:31-868`,
      `scripts/benchmarks/lib/trace.ts:229-234`,
      `scripts/benchmarks/lib/trace.ts:438-444`
- [x] Unified data block UI with smart blur, line numbering, and word wrap. Evidence:
      `scripts/benchmarks/lib/trace.ts:48-61`,
      `scripts/benchmarks/lib/trace.ts:677-731`
- [x] JSON-based configuration for model presets. Evidence:
      `benchmarks/config.json:1-25`,
      `scripts/benchmarks/lib/llm.ts:16-39`
  - [x] **Support for direct model names**: Allows using model names directly if no
        preset matches. Evidence: `scripts/benchmarks/lib/llm.ts:41-65`
  - [x] **Simplified Model Selection**: Replaced presets with direct model selection
        in `deno task bench` via `-m, --model` flag. Evidence:
        `scripts/task-bench.ts:55`, `scripts/task-bench.ts:96-99`
  - [x] **Native Context Discovery**: Benchmarks rely on `cursor-agent`'s native
        context discovery by ensuring the sandbox structure mimics a real project
        (including `.cursor/` folder). Evidence:
        `scripts/benchmarks/lib/runner.ts:118-134`
- [x] **Agent Under Test**: Benchmarks execute the `cursor-agent` binary in headless
      CLI mode within a dedicated sandbox environment, with interaction via standard
      input/output and arguments (e.g., `--resume` for multi-turn conversations).
      Evidence: `scripts/benchmarks/lib/spawned_agent.ts:168-216`
- [x] **Single-Turn Benchmark**: User query is embedded in the system prompt to
      simulate real-world single-turn agent invocation. Evidence:
      `scripts/benchmarks/lib/runner.ts:235-249`,
      `scripts/benchmarks/lib/spawned_agent.ts:211-213`
- [x] **Mandatory AGENTS.md**: Every scenario must have an `AGENTS.md` file in its
      fixtures or provided via config. Evidence:
      `scripts/benchmarks/lib/runner.ts:137-176`,
      `scripts/benchmarks/lib/runner.test.ts:122-161`
- [x] **Secure Execution**: Benchmarks run in an isolated environment (Docker or
      local process). Evidence: `scripts/benchmarks/lib/runner.ts:27-40`,
      `scripts/benchmarks/lib/spawned_agent.ts:171-173`
- [x] **Simulated User**: Support for interactive flows via `UserEmulator` LLM.
      Evidence: `scripts/benchmarks/lib/user_emulator.ts:10-62`,
      `scripts/benchmarks/lib/runner.ts:237-253`
- [x] **Environment Management**: `.env` support for API keys in benchmarks. Evidence:
      `scripts/benchmarks/lib/llm.ts:2-61`, `.env`

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
| `flow-review`                              | QA + code review of changes          |     [ ]     |                          |
| `flow-review-and-commit`                   | Review quality then commit           |     [x]     | `flow-review-and-commit-approve`, `flow-review-and-commit-reject` |
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

- **Description:** The `flow-init` skill bootstraps AI agent understanding of a
  project by analyzing codebase, generating 3 AGENTS.md files (root,
  `documents/`, `scripts/`), and scaffolding documentation. Uses
  `generate_agents.ts` (Deno/TS, read-only) for project analysis and template
  files from `assets/` as reference for agent-driven file generation.
- **Use case scenario:** User runs `/flow-init` on existing or new project. Agent
  runs the analysis script, determines Greenfield vs Brownfield by its own
  judgment, interviews user (Greenfield) or reverse-engineers architecture
  (Brownfield), generates 3 AGENTS.md files, documentation (SRS, SDS,
  whiteboard), and configures development commands.
- **Acceptance criteria:**
  - [x] **FR-8.1 Agent-driven Greenfield/Brownfield detection**: Script
        (`generate_agents.ts`) outputs `is_new` flag but SKILL.md explicitly
        instructs the agent to NOT rely on it. Agent determines project type
        based on file count, stack, file tree, and presence of config files.
        Evidence: `framework/skills/flow-init/scripts/generate_agents.ts:93-96`,
        `framework/skills/flow-init/SKILL.md` rule 4 "Greenfield/Brownfield Detection", step 2 "Analyze Project"
  - [x] **FR-8.2 Scripts are read-only (Deno/TS)**: Single script
        `generate_agents.ts` (command: `analyze`) only reads filesystem and
        outputs JSON to stdout. No file creation/modification. Evidence:
        `framework/skills/flow-init/scripts/generate_agents.ts:5-9`,
        `framework/skills/flow-init/scripts/generate_agents.ts:110`,
        `framework/skills/flow-init/SKILL.md` rule 5 "Scripts are read-only"
  - [x] **FR-8.3 No rule copying**: SKILL.md rule 6 explicitly prohibits
        copying rules to IDE-specific directories. Rule management outside
        flow-init scope. Evidence: `framework/skills/flow-init/SKILL.md` rule 6 "No rule copying"
  - [x] **FR-8.4 Auto-generation of missing documentation**: SKILL.md step 8
        generates `documents/requirements.md` (SRS), `documents/design.md`
        (SDS), `documents/whiteboard.md` from actual project data using LLM
        capabilities. Skips existing files exceeding line thresholds (50 for
        SRS/SDS, 10 for whiteboard). Evidence:
        `framework/skills/flow-init/SKILL.md` step 9 "Generate Documentation"
  - [x] **FR-8.5 Greenfield workflow**: SKILL.md step 3 defines structured
        interview collecting 10 data points (project name, vision, audience,
        problem, solution, risks, stack, architecture, key decisions, Deno
        tooling preference). Returns JSON for template filling. Evidence:
        `framework/skills/flow-init/SKILL.md` step 3 "Greenfield Workflow (Interview)"
  - [x] **FR-8.6 Brownfield workflow**: SKILL.md step 4 defines discovery
        (read config files, infer architecture/decisions) and extraction
        (semantically identify doc/script sections in existing `./AGENTS.md`,
        move to subdirectory files, remove from root). Evidence:
        `framework/skills/flow-init/SKILL.md` step 4 "Brownfield Workflow (Discovery & Extraction)"
  - [x] **FR-8.7 Multi-file architecture**: Produces 3 AGENTS.md files:
        `./AGENTS.md` (core rules, project metadata), `./documents/AGENTS.md`
        (documentation system rules), `./scripts/AGENTS.md` (development
        commands). Templates in `assets/` directory (3 files with
        `{{PLACEHOLDER}}` variables). Evidence:
        `framework/skills/flow-init/assets/AGENTS.template.md`,
        `framework/skills/flow-init/assets/AGENTS.documents.template.md`,
        `framework/skills/flow-init/assets/AGENTS.scripts.template.md`,
        `framework/skills/flow-init/SKILL.md` step 6 "Generate AGENTS.md Files"
  - [x] **FR-8.8 Per-file diff confirmation**: SKILL.md rules 3 and 8 require
        showing diffs and asking per-file confirmation before applying changes
        to existing files. Never silently overwrite. Evidence:
        `framework/skills/flow-init/SKILL.md` rule 3 "Idempotency",
        rule 8 "Per-File Diff Confirmation",
        step 6 "For each file"
  - [x] **FR-8.9 User content preservation**: SKILL.md rule 9 requires
        preserving user's existing instructions in brownfield. Extracted
        content takes priority over template content. Templates are fallbacks
        for greenfield only. Evidence:
        `framework/skills/flow-init/SKILL.md` rule 9 "Preserve User Content",
        step 4 "Important: extracted content...takes priority"
  - [x] **FR-8.10 Configure development commands**: SKILL.md step 10 detects
        stack, looks up specialized skills (e.g., `flow-skill-configure-deno-commands`),
        creates standard command interface (`check`, `test`, `dev`, `prod`).
        Verifies `check` command works. Evidence:
        `framework/skills/flow-init/SKILL.md` step 10 "Configure Development Commands"
  - [x] **FR-8.11 Cleanup**: SKILL.md step 12 removes temporary files
        (`project_info.json`, `interview_data.json`), verifies all 3
        AGENTS.md files exist, verifies no duplication between root and
        subdirectory files. Evidence:
        `framework/skills/flow-init/SKILL.md` step 11 "Cleanup & Verify"
  - [x] **FR-8.16 CLAUDE.md symlink**: Create `./CLAUDE.md` symlink to
        `./AGENTS.md` for Claude Code compatibility (see FR-19).
        Evidence: `framework/skills/flow-init/SKILL.md` step 7 "Claude Code Compatibility"
  - [x] **FR-8.12 OpenCode compatibility check**: SKILL.md step 8 checks
        `opencode.json` for subdirectory AGENTS.md glob entries, warns if
        missing. Evidence: `framework/skills/flow-init/SKILL.md` step 8 "OpenCode Compatibility Check"
  - [x] **FR-8.13 Stack detection**: `generate_agents.ts` detects 6 stacks
        (Node.js, Deno, Go, Rust, Python, Swift) via marker files. Skips 11
        directories (`.git`, `node_modules`, `.cursor`, `.claude`, `.opencode`,
        `dist`, `build`, `coverage`, `.dev`, `__pycache__`, `vendor`). Evidence:
        `framework/skills/flow-init/scripts/generate_agents.ts:76-92`
  - [x] **FR-8.14 Unit tests**: `generate_agents.test.ts` covers 8 scenarios
        (Deno/Node.js/Go detection, empty project, README reading, directory
        skipping, multi-stack, type exports). Evidence:
        `framework/skills/flow-init/scripts/generate_agents.test.ts`
  - [x] **FR-8.15 Benchmark coverage**: 5 benchmark scenarios: `greenfield`
        (interview flow), `brownfield` (discovery from scratch), `brownfield-update`
        (re-run with diffs and user content preservation), `brownfield-idempotent`
        (preserve files when user declines changes), `vision-integration`
        (pre-filled interview data). Evidence:
        `benchmarks/flow-init/scenarios/greenfield/mod.ts`,
        `benchmarks/flow-init/scenarios/brownfield/mod.ts`,
        `benchmarks/flow-init/scenarios/brownfield-update/mod.ts`,
        `benchmarks/flow-init/scenarios/brownfield-idempotent/mod.ts`,
        `benchmarks/flow-init/scenarios/vision-integration/mod.ts`

### 3.9 Multi-IDE Dev Resource Distribution (FR-9)

- **Description:** Dev resources (skills, agents, hooks) must be stored in a single
  IDE-agnostic directory (`.dev/`) and distributed to IDE-specific directories via
  symlinks.
- **Use case scenario:** Developer clones project, runs `deno task link`, and all
  three IDEs (Cursor, Claude Code, OpenCode) discover the same skills and agents.
- **Acceptance criteria:**
  - [x] `.dev/` is SPOT for dev skills, agents, hooks, and IDE configs. Evidence:
        `.dev/` directory, `scripts/task-link.ts:2`
  - [x] `deno task link` creates symlinks from `.dev/` to `.cursor/`, `.claude/`,
        `.opencode/` (skills and agents for all; hooks per-IDE where supported).
        Evidence: `scripts/task-link.ts:21-42`, `scripts/task-link.ts:125`,
        `deno.json:16`
  - [x] `deno task link` is idempotent (safe to run multiple times). Evidence:
        `scripts/task-link.ts:8`, `scripts/task-link.ts:93-103`
  - [x] `deno task link` does not destroy existing real files (warns and skips).
        Evidence: `scripts/task-link.ts:9`, `scripts/task-link.ts:107-115`
  - [x] `deno task dev` runs `deno task link` on startup. Evidence:
        `scripts/task-dev.ts:20-23`, `deno.json:14`
  - [x] `check-skills.ts` validates `.dev/skills/` (not `.cursor/skills/`). Evidence:
        `scripts/check-skills.ts:4`, `scripts/check-skills.ts:10-48`
  - [x] `.gitignore` excludes symlink targets, includes `.dev/` source. Evidence:
        `.gitignore:11-20`
  - [x] Post-clone setup documented in README. Evidence: `README.md:72-98`

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
        overwriting user's custom agents/skills. Evidence:
        `scripts/install.ts:181-192`, `scripts/install.ts:593`
  - [x] **FR-10.2 Multi-IDE support**: Script detects and supports Cursor
        (`~/.cursor/`), Claude Code (`~/.claude/`), OpenCode (`~/.config/opencode/`).
        Agents are per-IDE: reads from `framework/agents/{claude,cursor,opencode}/`
        with IDE-native frontmatter format. Evidence:
        `scripts/install.ts:109-143`
  - [x] **FR-10.3 Idempotent**: Safe to run multiple times. Existing symlinks are
        updated, non-symlink files are never overwritten (warn and skip). Evidence:
        `scripts/install.ts:13`, `scripts/install.ts:266-292`
  - [x] **FR-10.4 Install & update**: Same script handles both fresh install and
        update. Stale framework symlinks (pointing to removed framework items) are
        cleaned up. `--update` flag triggers `git pull` on existing clone. Evidence:
        `scripts/install.ts:340-348`, `scripts/install.ts:377-390`
  - [x] **FR-10.5 No user data loss**: User-created files/directories in IDE config
        dirs are never modified or removed. Evidence:
        `scripts/install.ts:14`, `scripts/install.ts:281-285`
  - [x] **FR-10.6 Remote execution**: Supports `deno run -A <url>` for one-liner
        install from repository. Auto-clones to `~/.assistflow/`. Requires Deno
        pre-installed. Evidence: `scripts/install.ts:331-334`,
        `scripts/install.ts:399-424`
  - [x] **FR-10.8 Agent per-item symlinks**: Agents MUST be installed as individual
        per-file symlinks (one symlink per agent `.md` file), same as skills are
        installed as per-directory symlinks. Verified in `install.ts` lines 195-213:
        each agent `.md` file gets its own symlink to `<ide-config>/agents/<name>.md`.
        Note: local `task-link.ts` uses directory-level symlinks for `.dev/agents/`
        (by design — dev resources vs product distribution are different). Evidence:
        `scripts/install.ts:194-213`
  - [x] **FR-10.7 Written in Deno/TypeScript**: No Python dependency. Evidence:
        `scripts/install.ts` (748 lines, Deno APIs throughout)

### 3.11 Conventional Commits — `agent` Type (FR-11)

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention
  used by `flow-commit`. Covers changes to agents, skills, `AGENTS.md`, and other
  AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent
  definition. On commit, the message is prefixed with `agent:` (e.g.,
  `agent: update flow-commit skill with atomic grouping rules`).
- **Acceptance criteria:**
  - [x] **FR-11.1 New type recognized**: `flow-commit` skill recognizes `agent:` as a
        valid Conventional Commits type. Evidence:
        `framework/skills/flow-commit/SKILL.md:37-38`
  - [x] **FR-11.2 Scope**: `agent:` type applies to changes in: `framework/agents/`,
        `framework/skills/`, `.dev/agents/`, `.dev/skills/`, `**/AGENTS.md`,
        `**/CLAUDE.md`, IDE-specific agent/skill directories (`.cursor/`, `.claude/`,
        `.opencode/` agents/skills subdirs). Evidence:
        `framework/skills/flow-commit/SKILL.md:39`
  - [x] **FR-11.3 Auto-detection**: `flow-commit` SKILL.md rule 4 instructs agent to
        auto-select `agent:` when ALL staged files match scope paths. Mixed changes
        (agent + app code) use the application type. Evidence:
        `framework/skills/flow-commit/SKILL.md:40-41`
  - [x] **FR-11.4 Documentation**: The `agent:` type is documented in `flow-commit`
        SKILL.md rule 4 (scope, auto-detection, examples) and in step 4 type list.
        Evidence: `framework/skills/flow-commit/SKILL.md:37-42`

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
        from `assets/` and generates files directly (no manifest). Evidence:
        `framework/skills/flow-init/SKILL.md` Context "File Structure",
        `framework/skills/flow-init/assets/AGENTS.template.md`,
        `framework/skills/flow-init/assets/AGENTS.documents.template.md`,
        `framework/skills/flow-init/assets/AGENTS.scripts.template.md`
  - [x] **FR-12.2 No data loss**: In brownfield, agent semantically extracts
        documentation/script sections from existing `./AGENTS.md` into subdirectory
        files. Per-file diff shown before applying. User confirms each file
        individually. Evidence: `framework/skills/flow-init/SKILL.md`
        rule 3 "Idempotency", rule 8 "Per-File Diff Confirmation",
        step 6 "For each file"
  - [x] **FR-12.3 Documents preservation**: Existing files exceeding line thresholds
        (50 for SRS/SDS, 10 for whiteboard) are not overwritten. Evidence:
        `framework/skills/flow-init/SKILL.md` step 9 "Generate Documentation"
  - [x] **FR-12.4 Diff-based update**: Agent shows diff per file, asks for
        confirmation. Evidence: `framework/skills/flow-init/SKILL.md`
        step 6 "For each file", step 5 "Report findings to user"
  - [ ] **FR-12.5 Idempotent re-run**: Running `flow-init` twice in a row with no
        manual changes produces no modifications on the second run.
  - [x] **FR-12.6 Deno/TS scripts**: `generate_agents.ts` — analyze-only (Deno).
        Template rendering removed; agent handles generation natively. Evidence:
        `framework/skills/flow-init/scripts/generate_agents.ts:1-10`,
        `framework/skills/flow-init/scripts/generate_agents.ts:126-138`
  - [x] **FR-12.7 OpenCode compatibility**: Agent checks `opencode.json` for
        subdirectory AGENTS.md glob entries. Warns if missing. Evidence:
        `framework/skills/flow-init/SKILL.md` step 8 "OpenCode Compatibility Check"

### 3.13 Migrate Framework-Specific Python Scripts to Deno/TypeScript (FR-13)

- **Description:** Python scripts in `framework/skills/` are split into two categories:
  **framework-specific** (AssistFlow lifecycle tooling: init, validate, package for
  commands/skills/rules) — must be migrated to Deno/TS to eliminate Deno users'
  Python dependency. **General-purpose** (universally useful utilities: token counting,
  Mermaid validation) — remain in Python as they serve any project regardless of
  framework.
- **Use case scenario:** User installs AssistFlow framework. Framework lifecycle
  scripts (scaffolding, validation, packaging) execute via `deno run`. General-purpose
  utility scripts remain as `python3` invocations (Python available in target
  environments).
- **Acceptance criteria:**
  - [x] **FR-13.1 Framework scripts migrated** (8 files → Deno/TS). Evidence:
    - `framework/skills/flow-engineer-command/scripts/init_command.ts`
    - `framework/skills/flow-engineer-command/scripts/validate_command.ts`
    - `framework/skills/flow-engineer-command/scripts/package_command.ts`
    - `framework/skills/flow-engineer-rule/scripts/init_rule.ts`
    - `framework/skills/flow-engineer-rule/scripts/validate_rule.ts`
    - `framework/skills/flow-engineer-skill/scripts/init_skill.ts`
    - `framework/skills/flow-engineer-skill/scripts/validate_skill.ts`
    - `framework/skills/flow-engineer-skill/scripts/package_skill.ts`
  - [x] **FR-13.2 General-purpose scripts remain Python** (2 files). Evidence:
    - `framework/skills/flow-skill-analyze-context/scripts/count_tokens.py`
    - `framework/skills/flow-skill-draw-mermaid-diagrams/scripts/validate.py`
  - [x] **FR-13.3 Behavioral parity**: Each migrated `.ts` script produces identical
        output (stdout messages, exit codes) as the Python original. Verified via
        56 unit tests covering all validation logic. Evidence:
        `framework/skills/flow-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flow-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flow-engineer-skill/scripts/skill_scripts_test.ts`
  - [x] **FR-13.4 SKILL.md references updated**: `flow-engineer-command`,
        `flow-engineer-rule`, `flow-engineer-skill` SKILL.md files reference
        `deno run -A scripts/*.ts` instead of `python3 scripts/*.py`. Evidence:
        `framework/skills/flow-engineer-command/SKILL.md:292`,
        `framework/skills/flow-engineer-rule/SKILL.md:215`,
        `framework/skills/flow-engineer-skill/SKILL.md:259-282`
  - [x] **FR-13.5 Stack update**: `AGENTS.md` tooling stack notes Python as
        "general-purpose utility scripts only" (not removed entirely). Evidence:
        `AGENTS.md:54`
  - [x] **FR-13.6 Tests**: 56 unit tests across 3 test files:
        `command_scripts_test.ts` (18), `skill_scripts_test.ts` (19),
        `rule_scripts_test.ts` (19). All pass. Evidence:
        `framework/skills/flow-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flow-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flow-engineer-skill/scripts/skill_scripts_test.ts`

### 3.14 Cross-IDE Hook/Plugin Format Transformation (FR-14)

- **Description:** All three supported IDEs have hook/plugin systems with
  different formats: Cursor hooks (`.cursor/hooks.json`), Claude Code hooks
  (`settings.json`, 18 event types), and OpenCode plugins
  (`.opencode/plugins/*.ts` with `plugin()` API). The framework provides
  comprehensive cross-IDE documentation in `flow-engineer-hook` SKILL.md
  with IDE-specific reference files, enabling AI agents to generate correct
  hook configurations from natural language requests.
- **Use case scenario:** Developer asks the agent to create a hook. The agent
  detects the IDE, reads the corresponding reference file, and generates
  the correct IDE-native configuration using documented templates and examples.
- **Design decision:** Canonical format = documented templates in SKILL.md with
  IDE-specific reference files, not a separate schema. Rationale: LLMs reliably
  follow template patterns; a separate canonical schema adds maintenance burden
  without benefit and cannot capture the fundamental architectural differences
  (declarative JSON vs programmatic TS modules).
- **Acceptance criteria:**
  - [x] **FR-14.1 Canonical format**: IDE-agnostic hook documentation with
        cross-IDE mapping tables, type availability matrix, and per-IDE
        reference files in `flow-engineer-hook/references/`. Evidence:
        `framework/skills/flow-engineer-hook/SKILL.md:33-68` (mapping table,
        availability matrix),
        `framework/skills/flow-engineer-hook/references/hooks_api.md`,
        `framework/skills/flow-engineer-hook/references/claude_code_hooks_api.md`,
        `framework/skills/flow-engineer-hook/references/opencode_plugins_api.md`
  - [x] **FR-14.2 Cursor output**: SKILL.md + reference provide templates for
        generating correct Cursor `hooks.json` configuration. Evidence:
        `framework/skills/flow-engineer-hook/SKILL.md:80-104` (Cursor section),
        `framework/skills/flow-engineer-hook/references/hooks_api.md`
  - [x] **FR-14.3 Claude Code output**: SKILL.md + reference provide templates
        for generating correct Claude Code `settings.json` hooks section.
        Cover all 18 event types. Evidence:
        `framework/skills/flow-engineer-hook/SKILL.md:106-147` (Claude Code section),
        `framework/skills/flow-engineer-hook/references/claude_code_hooks_api.md`,
        `benchmarks/flow-engineer-hook/scenarios/basic-claude-code/mod.ts` (benchmark PASSED)
  - [x] **FR-14.4 OpenCode output**: SKILL.md + reference provide templates
        for generating correct OpenCode plugin `.ts` files using `Plugin` type
        and `tool()` helper. Evidence:
        `framework/skills/flow-engineer-hook/SKILL.md:149-184` (OpenCode section),
        `framework/skills/flow-engineer-hook/references/opencode_plugins_api.md`
  - [x] **FR-14.5 Hook types**: Documentation covers `command` (script-based),
        `prompt` (LLM-based), `agent` (subagent-based), `http` (webhook), and
        programmatic (OpenCode) hook types with availability matrix per IDE.
        Evidence: `framework/skills/flow-engineer-hook/SKILL.md:33-41`

### 3.15 Update `flow-engineer-hook` for Cross-IDE Support (FR-15)

- **Description:** The `flow-engineer-hook` skill currently documents hook
  creation primarily for Cursor. It must be updated to cover Claude Code's
  expanded hook system (17+ events, three hook types: command/prompt/agent)
  and OpenCode's plugin system.
- **Use case scenario:** User asks to create a hook. The skill guides them
  through authoring for their target IDE, covering all available event types
  and hook mechanisms.
- **Acceptance criteria:**
  - [x] **FR-15.1 Claude Code hooks**: Document all 18 event types, four hook
        types (command, prompt, agent, http), and `settings.json` configuration.
        Evidence: `framework/skills/flow-engineer-hook/references/claude_code_hooks_api.md`
        (277 lines, all events with I/O schemas, 4 hook types with examples)
  - [x] **FR-15.2 OpenCode plugins**: Document `.opencode/plugins/*.ts` format,
        `tool()` helper, event API, and npm package distribution. Evidence:
        `framework/skills/flow-engineer-hook/references/opencode_plugins_api.md`
        (207 lines, 17 hooks, 22+ system events, tool() helper, npm distribution)
  - [x] **FR-15.3 Cursor hooks**: Retain existing Cursor hook documentation.
        Evidence: `framework/skills/flow-engineer-hook/SKILL.md:80-104`,
        `framework/skills/flow-engineer-hook/references/hooks_api.md` (updated
        with failClosed, loop_limit, env vars, Claude Code compatibility),
        `framework/skills/flow-engineer-hook/assets/hook_template.sh`
  - [x] **FR-15.4 Cross-IDE guidance**: Skill provides IDE-specific examples
        and notes which events/types are available per IDE. Evidence:
        `framework/skills/flow-engineer-hook/SKILL.md:33-68` (event mapping
        table + type availability matrix),
        `framework/skills/flow-engineer-hook/SKILL.md:106-184` (same hook
        "block rm -rf" shown in all 3 IDE formats)

### 3.16 Update `flow-engineer-command` for Claude Code Unification (FR-16)

- **Description:** Claude Code has unified commands and skills under a single
  namespace — `.claude/commands/` and `.claude/skills/` are now merged, with
  skills as the recommended format. The `flow-engineer-command` skill must
  reflect this change.
- **Use case scenario:** User asks to create a command for Claude Code. The skill
  informs them that Claude Code uses skills (SKILL.md) as the unified format
  and guides them accordingly.
- **Acceptance criteria:**
  - [x] **FR-16.1 Documentation update**: `flow-engineer-command/SKILL.md` notes
        that Claude Code commands = skills (unified namespace). Evidence:
        `framework/skills/flow-engineer-command/SKILL.md:37` (Note about
        `.claude/commands/` legacy vs `.claude/skills/` recommended)
  - [x] **FR-16.2 IDE-specific guidance**: Skill provides correct path and format
        for each IDE (Cursor: `.cursor/commands/`, Claude Code: `.claude/skills/`,
        OpenCode: `.opencode/commands/`). Evidence:
        `framework/skills/flow-engineer-command/SKILL.md:31-37`
  - [x] **FR-16.3 No breaking changes**: Existing command creation workflow for
        Cursor and OpenCode remains unchanged. Scripts are IDE-agnostic, operate
        on generic directory paths. Evidence:
        `framework/skills/flow-engineer-command/scripts/init_command.ts`,
        `framework/skills/flow-engineer-command/scripts/validate_command.ts`,
        `framework/skills/flow-engineer-command/scripts/package_command.ts`

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
        3 supported IDEs (Cursor, Claude Code, OpenCode). Evidence:
        `AGENTS.md:25`, `AGENTS.md:37`, `AGENTS.md:73`
  - [ ] **FR-17.3 Skill references**: `flow-engineer-rule`, `flow-engineer-command`,
        `flow-engineer-skill` SKILL.md files and their scripts are updated to
        match the decided IDE scope.
  - [x] **FR-17.4 Design doc**: `design.md` replaced "Cursor" with generic
        "IDE/Agent" terminology in algorithms section. Evidence:
        `documents/design.md:14-23`, `documents/design.md:26`,
        `documents/design.md:38`

### 3.18 Review-and-Commit Workflow — `flow-review-and-commit` (FR-18)

- **Description:** A composite command that first performs a quality review of the
  current implementation (using `flow-review` logic) and then, if the review passes,
  automatically invokes `flow-commit` to create atomic commits. Combines the review
  and commit steps into a single user action.
- **Use case scenario:** User completes a task and runs `/flow-review-and-commit`.
  The agent reviews the diff for task completion and code quality. If the review
  verdict is **Approve**, the agent proceeds to the commit workflow. If
  **Request Changes** or **Needs Discussion**, the agent reports findings and stops
  without committing.
- **Acceptance criteria:**
  - [x] **FR-18.1 Review phase**: Executes the full `flow-review` workflow (QA +
        code review) on current changes. Evidence:
        `framework/skills/flow-review-and-commit/SKILL.md:55-58`
  - [x] **FR-18.2 Gate logic**: Proceeds to commit ONLY if the review verdict is
        **Approve** (no critical issues). Stops and reports findings otherwise.
        Evidence: `framework/skills/flow-review-and-commit/SKILL.md:60-68`
  - [x] **FR-18.3 Commit phase**: Invokes `flow-commit` workflow (documentation
        audit, pre-commit verification, atomic grouping, commit execution).
        Evidence: `framework/skills/flow-review-and-commit/SKILL.md:70-73`
  - [x] **FR-18.4 Single command**: Available as `/flow-review-and-commit` chat
        command. User does not need to run review and commit separately.
        Evidence: `framework/skills/flow-review-and-commit/SKILL.md:1-4`
  - [x] **FR-18.5 Transparency**: Reports both review results and commit results
        to the user in a single output.
        Evidence: `framework/skills/flow-review-and-commit/SKILL.md:75-78`

### 3.19 CLAUDE.md Symlink in flow-init (FR-19)

- **Description:** `flow-init` must create a `CLAUDE.md` symlink pointing to
  `./AGENTS.md` in the project root. This ensures Claude Code reads the same
  rules as other IDEs (SPOT — single point of truth). The project itself uses
  this pattern: `CLAUDE.md -> ./AGENTS.md`.
- **Use case scenario:** User runs `/flow-init` on a project that uses Claude Code.
  In addition to the 3 `AGENTS.md` files, the agent creates a `./CLAUDE.md`
  symlink to `./AGENTS.md` so Claude Code picks up the project rules natively.
- **Acceptance criteria:**
  - [x] **FR-19.1 Symlink creation**: `flow-init` creates `./CLAUDE.md` as a
        relative symlink to `./AGENTS.md` (both Greenfield and Brownfield).
        Evidence: `framework/skills/flow-init/SKILL.md` step 7 "Claude Code Compatibility"
  - [x] **FR-19.2 Idempotency**: If `./CLAUDE.md` already exists as a correct
        symlink, skip silently. If it exists as a regular file or wrong symlink,
        warn the user and ask for confirmation before replacing.
        Evidence: `framework/skills/flow-init/SKILL.md` step 7 "If CLAUDE.md exists..."
  - [x] **FR-19.3 Verification**: Cleanup step verifies `./CLAUDE.md` symlink
        exists and points to `./AGENTS.md`.
        Evidence: `framework/skills/flow-init/SKILL.md` step 11 "Cleanup & Verify"

### 3.20 Devcontainer Setup in flow-init (FR-20)

- **Description:** `flow-init` must offer to create a `.devcontainer/` configuration
  for the project. The agent asks the user whether they want a devcontainer; if the
  user agrees, the agent generates `devcontainer.json` (and optionally a `Dockerfile`)
  based on the detected or declared tech stack.
- **Use case scenario:** User runs `/flow-init` on a project. After the main setup,
  the agent asks "Would you like to set up a devcontainer for reproducible development
  environments?" If the user agrees, the agent creates `.devcontainer/devcontainer.json`
  with appropriate base image, extensions, and post-create commands derived from the
  project stack.
- **Acceptance criteria:**
  - [ ] **FR-20.1 User consent**: Agent asks the user before creating devcontainer
        files. Devcontainer is NOT created without explicit user agreement.
  - [ ] **FR-20.2 Stack-aware generation**: `devcontainer.json` references a base
        image matching the detected stack (e.g., `mcr.microsoft.com/devcontainers/typescript-node`
        for Node/TS, `denoland/deno` for Deno). Extensions list includes relevant
        IDE extensions for the stack.
  - [ ] **FR-20.3 Idempotency**: If `.devcontainer/` already exists, the agent shows
        diff and asks for per-file confirmation before overwriting (same pattern as
        other brownfield files).
  - [ ] **FR-20.4 Greenfield interview integration**: For greenfield projects, the
        devcontainer question is included in the interview (step 3).
  - [ ] **FR-20.5 Verification**: Cleanup step verifies `.devcontainer/devcontainer.json`
        exists (if user agreed) and is valid JSON.

### 3.21 Universal Skill & Script Requirements (FR-21)

- **Description:** All framework skills MUST conform to the agentskills.io
  standard and work identically across supported IDEs (Cursor, Claude Code,
  OpenCode). Scripts bundled with skills MUST be cross-IDE compatible.
- **Use case scenario:** A developer installs AssistFlow skills via
  `deno task link`. Skills with bundled scripts work in any of the three
  supported IDEs without modification.
- **Priority:** High (foundational for multi-IDE support).

#### FR-21.1 agentskills.io Compliance

- **Acceptance criteria:**
  - [ ] **FR-21.1.1 Directory structure**: Every skill is a directory with
        `SKILL.md` (required) and optional `scripts/`, `references/`, `assets/`
        subdirectories. No other top-level conventions (README.md, CHANGELOG.md).
  - [ ] **FR-21.1.2 Frontmatter**: `name` (required, max 64 chars, `[a-z0-9-]`,
        must match parent directory name) and `description` (required, max 1024
        chars). Optional: `license`, `compatibility`, `metadata`,
        `allowed-tools` (experimental), `disable-model-invocation`.
  - [ ] **FR-21.1.3 Progressive disclosure**: Metadata (~100 tokens) loaded at
        startup; full SKILL.md (<5000 tokens, <500 lines) on activation;
        scripts/references/assets loaded only when required.
  - [ ] **FR-21.1.4 File references**: One level deep from SKILL.md. No nested
        reference chains.

#### FR-21.2 Cross-IDE Script Path Resolution

- **Acceptance criteria:**
  - [ ] **FR-21.2.1 Relative paths**: SKILL.md MUST reference scripts using
        relative paths from the skill root (e.g., `scripts/validate.ts`,
        `python3 scripts/process.py`). Per agentskills.io client
        implementation guide, the IDE resolves relative paths against the
        skill's directory and converts to absolute paths in tool calls.
  - [ ] **FR-21.2.2 No custom path placeholders**: Do NOT use custom
        placeholders like `<this-skill-dir>` in framework skills. The
        agentskills.io standard defines relative paths as the canonical
        mechanism; IDEs are responsible for resolution. Existing skills
        using `<this-skill-dir>` MUST be migrated to plain relative paths.
  - [ ] **FR-21.2.3 No IDE-specific path variables**: Do NOT use
        `${CLAUDE_SKILL_DIR}` or other IDE-specific variables in framework
        skills. These are IDE extensions, not part of the agentskills.io
        standard, and break portability.

#### FR-21.3 Script Requirements

- **Acceptance criteria:**
  - [ ] **FR-21.3.1 Non-interactive**: Scripts MUST NOT use interactive prompts
        (stdin confirmation, interactive menus). All input via CLI flags, env
        vars, or stdin piping. Agents run in non-interactive shells.
  - [ ] **FR-21.3.2 Structured output**: Scripts MUST output structured data
        (JSON preferred) to stdout. Diagnostics/progress to stderr. This
        enables reliable parsing by any agent implementation.
  - [ ] **FR-21.3.3 Self-contained dependencies**: Scripts MUST declare
        dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for
        Deno/TS). No implicit global installs required.
  - [ ] **FR-21.3.4 Help output**: Scripts SHOULD implement `--help` flag as
        the primary way agents learn the script interface.
  - [ ] **FR-21.3.5 Meaningful exit codes**: Exit 0 on success, non-zero on
        failure. Scripts SHOULD use distinct codes for different error types.
  - [ ] **FR-21.3.6 Read-only by default**: Analysis/validation scripts MUST
        NOT create, write, or modify project files. File creation is the
        agent's responsibility unless the script's explicit purpose is
        generation.
  - [ ] **FR-21.3.7 Idempotent**: Scripts MUST be safe to run multiple times
        with the same input producing the same output.
  - [ ] **FR-21.3.8 Error messages**: Scripts MUST provide clear, actionable
        error messages to stderr. Include what failed, why, and how to fix.
  - [ ] **FR-21.3.9 Dry-run support**: Scripts performing destructive
        operations SHOULD support `--dry-run` flag.

#### FR-21.4 Script Language Policy

- **Acceptance criteria:**
  - [ ] **FR-21.4.1 Framework scripts in Deno/TS**: All framework product
        scripts (`framework/skills/*/scripts/`) MUST be written in
        Deno/TypeScript. Consistent with FR-13.
  - [ ] **FR-21.4.2 General-purpose utilities in Python**: Utility scripts
        not part of the framework product (token counting, diagram validation)
        MAY use Python. Consistent with FR-13.2.
  - [ ] **FR-21.4.3 User-facing skills are language-agnostic**: The
        agentskills.io standard allows any language. Framework documentation
        (e.g., `flow-engineer-skill`) MUST NOT restrict users to a single
        language. Common options: Python, Bash, JavaScript/TypeScript.

#### FR-21.5 Script Execution Model

- **Acceptance criteria:**
  - [ ] **FR-21.5.1 Agent-driven execution**: Scripts are NOT auto-executed.
        The agent reads SKILL.md instructions and decides when to run scripts
        using its standard code execution tool (Bash/terminal). This is
        consistent across all three IDEs.
  - [ ] **FR-21.5.2 No dedicated script runner**: There is no special "script
        runner" tool in any supported IDE. All script execution goes through
        the generic Bash/terminal tool.
  - [ ] **FR-21.5.3 allowed-tools hint**: Skills MAY use the `allowed-tools`
        frontmatter field (experimental) to pre-approve tools needed for
        script execution (e.g., `Bash(deno:*)`). This reduces permission
        prompts but is not guaranteed across all IDEs.

#### FR-21.6 Skill Discovery Paths

- **Acceptance criteria:**
  - [ ] **FR-21.6.1 Framework distribution**: Framework skills are distributed
        from `framework/skills/` to IDE directories via `deno task link`
        (symlinks). See FR-9, FR-10.
  - [ ] **FR-21.6.2 Cross-IDE discovery**: Skills MUST be discoverable by all
        three IDEs. The `.agents/skills/` convention is the cross-IDE standard
        path. IDE-specific paths: `.cursor/skills/`, `.claude/skills/`,
        `.opencode/skills/`.
  - [ ] **FR-21.6.3 Name collision**: Project-level skills override user-level
        skills when names collide (per agentskills.io client implementation
        guide).

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
