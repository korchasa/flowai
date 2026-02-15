# AssistFlow

A collection of Cursor skills and agents, designed to standardize work across
various software development contexts.

!!!WARNING!!! DO NOT USE THIS FILES AS IS. YOU MUST MODIFY THEM TO FIT YOUR
PROJECT AND YOUR STYLE OF WORK.

## Developer Workflow

This section provides clear instructions on when and what tools to use during
the development lifecycle.

### 1. Start of Project

**Goal**: Ensure the environment is ready and the project base is solid.

- **Initialize Project**: Use `flow-init` skill to set up the project structure
  and initial documentation if starting fresh.

### 2. For Each Task

**Goal**: Implement features or fixes with high quality and documentation
coverage.

1. **Plan**: Use `flow-plan` skill to analyze the request, break it down into
   steps, and create a plan.
2. **Execute**: Use `flow-do` (or `flow-execute`) skill to write code. This
   ensures adherence to TDD and documentation updates.
3. **Verify**:
   - Run `deno task test` to check specific tests.
   - **MANDATORY**: Run `deno task check` before completion to ensure the entire
     project is healthy.
4. **Commit**: Use `flow-commit` skill to generate a Conventional Commits
   compliant message and commit changes.

### 3. Periodic Maintenance

**Goal**: Keep the project clean, documented, and up-to-date.

- **Health Check**: Run `flow-maintenance` or `deno task check` regularly to
  catch regressions.
- **Update Agents**: Run `deno task check` to ensure all rules are consistent.

### 4. Specific cases

- **Deep Investigation**: Use `flow-investigate` if you encounter complex bugs or
  unexplained behavior.
- **Engineering Utilities**: Use `flow-engineer-prompt` or `flow-engineer-rule`
  when creating or refining AI instructions.
- **Codebase Q&A**: Use `flow-answer` to get explanations or find logic within
  the project.
- **Maintenance Audit**: Use `flow-maintenance` for a comprehensive project
  health check and optimization suggestions.

## Using Skills in Cursor

Cursor supports custom skills that create reusable workflows. This helps
standardize team processes and speeds up typical tasks.

### How Skills Work

1. Skills are stored in `.cursor/skills/` directory as `SKILL.md` files within
   subdirectories.
2. Skills provide structured workflows for development activities.
3. Each skill contains detailed instructions for specific tasks.

### Available Skills & Commands

#### 1. Core Workflow (Daily Development)
- `flow-init` - Initialize a new project with AssistFlow structure
- `flow-plan` - Analyze request and create a detailed plan
- `flow-do` - Execute a task (general purpose)
- `flow-execute` - Execute a planned task with TDD
- `flow-auto` - Autonomous task manager with feedback loop
- `flow-commit` - Commit changes with Conventional Commits
- `flow-qa` - Run Quality Assurance checks
- `flow-reflect` - Reflect on recent work and update context
- `flow-maintenance` - Project health check and maintenance
- `flow-investigate` - Deep investigation of bugs/issues
- `flow-answer` - Answer questions about the codebase

#### 2. Engineering (Extending AssistFlow)
- `flow-engineer-command` - Create or modify a command
- `flow-engineer-skill` - Create or modify a skill
- `flow-engineer-rule` - Create or modify a rule
- `flow-engineer-hook` - Create or modify a hook
- `flow-engineer-subagent` - Create or modify a subagent

#### 3. Setup & Configuration
- `flow-setup-code-style-ts-deno` - Setup Deno/TS code style
- `flow-setup-code-style-ts-strict` - Setup strict TypeScript
- `flow-skill-configure-deno-commands` - Configure Deno tasks
- `flow-skill-configure-strict-typescript` - Configure strict TS rules
- `flow-skill-ai-skel-ts` - Scaffold AI agent skeleton

#### 4. Specialized Skills (Helper Tools)
- `flow-skill-draw-mermaid-diagrams` - Create/Edit Mermaid diagrams
- `flow-skill-write-agent-benchmarks` - Write agent benchmarks
- `flow-skill-write-dep` - Write a DEP (Development Enhancement Proposal)
- `flow-skill-write-gods-tasks` - Write tasks in GODS format
- `flow-skill-write-prd` - Write a PRD (Product Requirements Document)
- `flow-skill-write-in-informational-style` - Guide for informational writing style
- `flow-skill-manage-github-tickets-by-mcp` - Manage GitHub tickets
- `flow-skill-debug-by-playwright` - Debug using Playwright
- `flow-skill-fix-tests` - Fix failing tests
- `flow-skill-conduct-qa-session` - Conduct a Q&A session
- `flow-skill-analyze-context` - Analyze token usage
- `flow-skill-cursor-agent-integration` - Integrate with Cursor Agent
- `flow-skill-engineer-prompts-for-instant` - Prompt engineering for instant models
- `flow-skill-engineer-prompts-for-reasoning` - Prompt engineering for reasoning models
- `flow-skill-deno-cli` - Deno CLI wrapper
- `flow-skill-deno-deploy` - Deno Deploy wrapper

## Framework

The core philosophy is to collaborate with the agent using explicit workflows
and rigid verification, while maintaining all context in the repository.

### Key Principles

1. **Agent-Driven Workflow**: The agent operates within defined boundaries using
   skills to switch contexts (Planning, Execution, Review).
2. **Structured Knowledge**:
   - **Skills** (`.cursor/skills/`): Interactive workflows and how-to guides.
   - **Agents** (`.cursor/agents/`): Specialized agent definitions.
   - **Documentation** (`documents/`): The "Long-Term Memory" of the project.
     All architectural decisions and requirements must be recorded here.
3. **Unified Verification**:
   - `deno task check` is the single source of truth for project health.
   - If `deno task check` fails, the task is not complete.
4. **Zero-Config Dev**:
   - All project scripts are centralized in `deno.json`.
   - No hidden dependencies or manual setup steps.

### Architecture

- **Skills** (`.cursor/skills/`): Capabilities and workflows.
- **Agents** (`.cursor/agents/`): AI personas.
- **Docs Schemas** (`docs-schema-*`): Templates for documentation.
- **How-To** (`flow-skill-*`): Context-sensitive guides for specific problems.

## Project Documentation

Documentation in this project is not just information for developers — it is the
**Long-Term Memory** of the AI agent. AI models have a limited context window
and lose information between chat sessions. By keeping a structured set of
documents in the `documents/` folder, we ensure that any agent (or developer)
can quickly understand the project's state, goals, and architecture.

### Why Documentation is Critical

- **Context Persistence**: Documents bridge the gap between sessions, providing
  the agent with the necessary background to make informed decisions.
- **Architectural Integrity**: By recording decisions in `design.md`, we prevent
  the agent from proposing solutions that contradict the established
  architecture.
- **Goal Alignment**: Product Vision (in `AGENTS.md`) and `requirements.md` keep the development
  focused on solving the right problems.
- **Autonomous Operation**: Clear documentation is what allows the agent to work
  autonomously without constant human guidance.

### Document Types and Their Purpose

- **Product Vision**: The "North Star" of the project (stored in `AGENTS.md`). It explains
  _why_ the project exists, who it's for, and what makes it unique. It helps the
  agent understand high-level priorities.
- **`requirements.md` (SRS)**: Detailed functional and non-functional
  requirements. Defines _what_ the system must do and is the primary reference
  for acceptance criteria.
- **`design.md` (SDS)**: Technical architecture, component descriptions, and
  data models. Describes _how_ the system is implemented to ensure architectural
  consistency.
- **`AGENTS.md`**: High-level rules for AI agents. Enforces mandatory workflows
  and defines agent responsibilities.

## License

The project is distributed under the MIT license.
