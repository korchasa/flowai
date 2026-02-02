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
  `af-skill-fix-tests/RULE.md` and follows the procedure.
- **Acceptance criteria:**
  - [x] Support for 14 how-to guides covering commit workflows, documentation,
        debugging, testing, Git operations, GitHub management, hooks configuration, and GODS tasks
  - [x] Guides follow `af-skill-*/` directory naming convention with `SKILL.md`
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
| **Commands (af-*)**         |                                |             |               |
| `af-answer`                 | Answering user questions       |     [ ]     |               |
| `af-commit`                 | Atomic commits and QA          |     [x]     | `af-commit-*` |
| `af-create-vision-doc`      | Creating VISION.md             |     [ ]     |               |
| `af-do`                     | General task execution         |     [ ]     |               |
| `af-engineer-command`       | Creating new AF commands       |     [ ]     |               |
| `af-engineer-hook`          | Creating Cursor hooks          |     [ ]     |               |
| `af-execute`                | Executing planned tasks        |     [ ]     |               |
| `af-init`                   | Project initialization         |     [x]     | `af-init-*`   |
| `af-investigate`            | Code investigation/debugging   |     [ ]     |               |
| `af-maintenance`            | Periodic project health checks |     [ ]     |               |
| `af-plan`                   | Task planning (GODS)           |     [x]     | `af-plan-*`   |
| `af-plan-interactive`     | Plan with multi-turn selection |     [x]     | `af-plan-interactive` |
| `af-qa`                     | Quality assurance session      |     [ ]     |               |
| `af-reflect`                | Self-reflection on task        |     [ ]     |               |
| **Guides (af-skill-*)**     |                                |             |               |
| `af-skill-conduct-qa`       | Conducting QA sessions         |     [ ]     |               |
| `af-skill-debug-playwright` | Debugging with Playwright      |     [ ]     |               |
| `af-skill-draw-mermaid`     | Drawing Mermaid diagrams       |     [ ]     |               |
| `af-skill-eng-prompt-inst`  | Prompt engineering (Instant)   |     [ ]     |               |
| `af-skill-eng-prompt-reas`  | Prompt engineering (Reasoning) |     [ ]     |               |
| `af-skill-engineer-hook`    | Creating Cursor hooks          |     [ ]     |               |
| `af-skill-fix-by-benchmarks` | Fixing skills via benchmarks |     [x]     |               |
| `af-skill-fix-tests`        | Fixing broken tests            |     [ ]     |               |
| `af-skill-manage-github`    | Managing GitHub via MCP        |     [ ]     |               |
| `af-skill-write-bench`      | Writing agent benchmarks       |     [x]     |               |
| `af-skill-write-dep`        | Writing DEP documents          |     [ ]     |               |
| `af-skill-write-gods`       | Writing GODS tasks             |     [ ]     |               |
| `af-skill-write-info`       | Writing in info style          |     [ ]     |               |
| `af-skill-write-prd`        | Writing PRDs                   |     [ ]     |               |
| `af-skill-cursor-agent-integration` | Integration with cursor-agent CLI | [x] | |
| `af-skill-analyze-context` | Analyze token usage in context | [x] | |
| `af-refactor-user-manager` | Refactoring UserManager        |     [ ]     |               |

## 4. Non-functional requirements

window.

- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based
  verification. Execution must be protected by timeouts (e.g., 60s per step) to
  ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes
  (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/af-commit`). Benchmark
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
