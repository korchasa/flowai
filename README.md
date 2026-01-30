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

- **Initialize Project**: Use `af-init` skill to set up the project structure
  and initial documentation if starting fresh.
- **Define Vision**: Use `af-create-vision-doc` skill to create or update the
  project vision in `documents/vision.md`.

### 2. For Each Task

**Goal**: Implement features or fixes with high quality and documentation
coverage.

1. **Plan**: Use `af-plan` skill to analyze the request, break it down into
   steps, and create a plan.
2. **Execute**: Use `af-do` (or `af-execute`) skill to write code. This
   ensures adherence to TDD and documentation updates.
3. **Verify**:
   - Run `deno task test` to check specific tests.
   - **MANDATORY**: Run `deno task check` before completion to ensure the entire
     project is healthy.
4. **Commit**: Use `af-commit` skill to generate a Conventional Commits
   compliant message and commit changes.

### 3. Periodic Maintenance

**Goal**: Keep the project clean, documented, and up-to-date.

- **Health Check**: Run `af-check-and-fix` or `deno task check` regularly to
  catch regressions.
- **Update Agents**: Run `deno task check` to ensure all rules are consistent.

### 4. Specific cases

- **Deep Investigation**: Use `af-investigate` if you encounter complex bugs or
  unexplained behavior.
- **Engineering Utilities**: Use `af-engineer-prompt` or `af-engineer-rule`
  when creating or refining AI instructions.
- **Codebase Q&A**: Use `af-answer` to get explanations or find logic within
  the project.
- **Maintenance Audit**: Use `af-maintenance` for a comprehensive project
  health check and optimization suggestions.

## Using Skills in Cursor

Cursor supports custom skills that create reusable workflows. This helps
standardize team processes and speeds up typical tasks.

### How Skills Work

1. Skills are stored in `.cursor/skills/` directory as `SKILL.md` files within
   subdirectories.
2. Skills provide structured workflows for development activities.
3. Each skill contains detailed instructions for specific tasks.

### Available Skills

- `af-answer` - Answer questions with context from codebase
- `af-check-and-fix` - **Iterative check and fix**: run project checks and fix
  errors until success
- `af-commit` - Git commit workflow following Conventional Commits
- `af-create-scripts` - Create the Deno task scripts
- `af-create-vision-doc` - Create vision documentation
- `af-do` - General task execution workflow
- `af-engineer-prompt` - Prompt engineering utility
- `af-engineer-rule` - Rule engineering utility
- `af-execute` - Execute and implement planned tasks
- `af-investigate` - Deep investigation and root cause diagnosis
- `af-maintenance` - Project maintenance and health audit
- `af-plan` - Plan and break down complex development tasks
- `af-qa` - Quality Assurance workflow
- `af-reflect` - Reflect on recent work and update context
- `draw-mermaid-diagrams` - Create and edit Mermaid diagrams
- `init` - Project initialization workflow
- `write-agent-benchmarks` - Create and run agent benchmarks

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
- **How-To** (`af-skill-*`): Context-sensitive guides for specific problems.

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
- **Goal Alignment**: `vision.md` and `requirements.md` keep the development
  focused on solving the right problems.
- **Autonomous Operation**: Clear documentation is what allows the agent to work
  autonomously without constant human guidance.

### Document Types and Their Purpose

- **`vision.md` (Product Vision)**: The "North Star" of the project. It explains
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
