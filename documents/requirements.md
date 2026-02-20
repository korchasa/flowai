# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and
  Commands project.
- **Scope:** A collection of Cursor rules and commands to standardize and
  enhance development workflows in AI-first IDEs (initially Cursor).
- **Audience:** Developers and AI agents working in Cursor.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).

## 2. General description

- **System context:** A set of configuration files (`.md`, RULE.md) located in
  the `.cursor` directory of a project, interpreted by the Cursor AI agent to
  guide development, enforce rules, and execute workflows.
- **Assumptions and constraints:**
  - **Assumptions:** The user is using Cursor IDE. The project structure follows
    the defined conventions.
  - **Constraints:** functionality is limited by Cursor's rule capabilities and
    the agent's context window.

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
  `flow-skill-fix-tests/RULE.md` and follows the procedure.
- **Acceptance criteria:**
  - [x] Support for 14 how-to guides covering commit workflows, documentation,
        debugging, testing, Git operations, GitHub management, hooks configuration, and GODS tasks
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

### 3.8 Skill Coverage Matrix

The benchmarking system must cover all core AssistFlow skills to ensure reliability across all workflows.

| Skill ID                    | Description                    | Benchmarked | Scenario ID   |
| :-------------------------- | :----------------------------- | :---------: | :------------ |
| **Commands (flow-*)**         |                                |             |               |
| `flow-answer`                 | Answering user questions       |     [ ]     |               |
| `flow-commit`                 | Atomic commits and QA          |     [x]     | `flow-commit-*` |
| `flow-create-vision-doc`      | Creating VISION.md             |     [ ]     |               |
| `flow-do`                     | General task execution         |     [ ]     |               |
| `flow-engineer-command`       | Creating new AF commands       |     [ ]     |               |
| `flow-engineer-hook`          | Creating Cursor hooks          |     [ ]     |               |
| `flow-execute`                | Executing planned tasks        |     [ ]     |               |
| `flow-init`                   | Project initialization         |     [x]     | `flow-init-*`   |
| `flow-investigate`            | Code investigation/debugging   |     [ ]     |               |
| `flow-maintenance`            | Periodic project health checks |     [ ]     |               |
| `flow-plan`                   | Task planning (GODS)           |     [x]     | `flow-plan-*`   |
| `flow-plan-interactive`     | Plan with multi-turn selection |     [x]     | `flow-plan-interactive` |
| `flow-qa`                     | Quality assurance session      |     [ ]     |               |
| `flow-reflect`                | Self-reflection on task        |     [x]     | `flow-reflect-*` |
| **Guides (flow-skill-*)**     |                                |             |               |
| `flow-skill-conduct-qa`       | Conducting QA sessions         |     [ ]     |               |
| `flow-skill-debug-playwright` | Debugging with Playwright      |     [ ]     |               |
| `flow-skill-draw-mermaid`     | Drawing Mermaid diagrams       |     [ ]     |               |
| `flow-skill-eng-prompt-inst`  | Prompt engineering (Instant)   |     [ ]     |               |
| `flow-skill-eng-prompt-reas`  | Prompt engineering (Reasoning) |     [ ]     |               |
| `flow-skill-engineer-hook`    | Creating Cursor hooks          |     [ ]     |               |
| `flow-skill-fix-by-benchmarks` | Fixing skills via benchmarks |     [x]     |               |
| `flow-skill-fix-tests`        | Fixing broken tests            |     [ ]     |               |
| `flow-skill-manage-github`    | Managing GitHub via MCP        |     [ ]     |               |
| `flow-skill-write-bench`      | Writing agent benchmarks       |     [x]     |               |
| `flow-skill-write-dep`        | Writing DEP documents          |     [ ]     |               |
| `flow-skill-write-gods`       | Writing GODS tasks             |     [ ]     |               |
| `flow-skill-write-info`       | Writing in info style          |     [ ]     |               |
| `flow-skill-write-prd`        | Writing PRDs                   |     [ ]     |               |
| `flow-skill-cursor-agent-integration` | Integration with cursor-agent CLI | [x] | |
| `flow-skill-analyze-context` | Analyze token usage in context | [x] | |
| `flow-diff-specialist` | Analyze git diffs and plan commits | [ ] | |
| `flow-prompt-engineer` | Craft prompts for reasoning models | [ ] | |
| `flow-skill-executor` | Execute specific skills or prompts | [ ] | |
| `flow-skill-deno-cli` | Manage Deno via CLI | [ ] | |
| `flow-skill-deno-deploy` | Manage Deno Deploy | [ ] | |
| `flow-skill-ai-skel-ts` | AI agent scaffold | [ ] | |
| `flow-skill-playwright-cli` | Browser automation via CLI | [ ] | |
| `flow-skill-deep-research` | Multi-directional web-based deep research | [ ] | |
| `deep-research-worker` | Single-direction research worker (sub-agent) | [ ] | |
| `flow-setup-code-style-ts-deno` | Setup Deno/TS code style | [ ] | |
| `flow-setup-code-style-ts-strict` | Setup strict TypeScript | [ ] | |
| `cursor-desktop-guide` | Guide for Cursor desktop features | [ ] | |
| `opencode-guide` | Guide for OpenCode features | [ ] | |
| `flow-refactor-user-manager` | Refactoring UserManager        |     [ ]     |               |

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

## 4. Non-functional requirements

window.

- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based
  verification. Execution must be protected by timeouts (e.g., 60s per step) to
  ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes
  (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/flow-commit`). Benchmark
  reports must be human-readable and provide actionable feedback via `trace.md`.

## 5. Interfaces

- **APIs and integrations:**
  - Cursor Chat: Primary interface for user-agent interaction.
  - File System: Storage for rules, commands, and documentation.
  - Git: Version control operations.
  - MCP: Integration with external tools (GitHub, etc.).
- **Protocols and data formats:** Markdown (`.md`, RULE.md).
- **UI/UX constraints:** Text-based chat interface.

## 6. Acceptance criteria

- The system is considered accepted if the following are met:
  - All defined commands are executable by the Cursor agent.
  - Rules are correctly loaded and applied by the Cursor agent.
  - Documentation accurately reflects the project state.
