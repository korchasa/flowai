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
    User[User] -->|Chat Input| Cursor[Cursor IDE]
    Cursor -->|Reads| Skills[.cursor/skills/*/SKILL.md]
    Cursor -->|Reads| Agents[.cursor/agents/*.md]
    Cursor -->|Updates| Docs[documents/*.md]
    Cursor -->|Executes| Actions[Code/Git/MCP]
  ```
- **Main subsystems and their roles:**
  - **Skills Subsystem:** Defines procedural workflows and capabilities.
  - **Agents Subsystem:** Defines specialized agent roles and prompts.
  - **Benchmark Runner:** Specialist in executing and analyzing agent benchmarks.
  - **Documentation Subsystem:** Stores project state and memory.

## 3. Components

### 3.1 Skills (`.cursor/skills/`)

- **Purpose:** Provide specialized capabilities and workflows.
- **Interfaces:** Directories containing `SKILL.md` files.
- **Categories:**
  - `flow-*`: Command-like skills (e.g., `flow-maintenance`, `flow-commit`, `flow-auto`).
  - `flow-skill-*`: Practical guides (e.g., `flow-skill-fix-tests`).
  - `rules-*`: Behavioral frameworks (e.g., `rules-tdd`).
  - `deno-*`: Deno-specific tools (`deno-cli`, `deno-deploy`).
- **Composition**: Skills can delegate to other skills (e.g., `flow-init` delegates development command configuration to `flow-skill-configure-*-commands`).

### 3.2 Agents (`.cursor/agents/`)

- **Purpose:** Define specialized AI personas and roles.
- **Interfaces:** Markdown files in `.cursor/agents/`.
- **Key Agents:**
  - `flow-commit.md`: Specialist in QA, documentation updates, and atomic commits.
  - `flow-diff-specialist.md`: Specialist in analyzing git diffs and planning atomic commits.
  - `flow-skill-executor.md`: Specialist in executing any prompt or task or specific skills.
  - `flow-prompt-engineer.md`: Specialist in crafting detailed prompts for reasoning models.
  - `benchmark-runner.md`: Specialist in executing and analyzing agent benchmarks.
  - `interviewer.md`: Specialist in gathering information.
  - `project-checker.md`: Specialist in running project checks.

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

## 4. Data and Storage

- **Entities and attributes:**
  - **Skill:** Name, Content, Path.
  - **Agent:** Name, Prompt, Capabilities.
- **ER diagram:** N/A (File-based storage).
- **Migration policies:** Manual updates via git.

## 5. Algorithms and Logic

- **Key algorithms:**
  - **Skill Matching:** Cursor matches user intent to available skills.
  - **Agent Selection:** Cursor selects appropriate agents based on task.
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

- Integration with other AI IDEs.
- Automated validation scripts for skill syntax.
