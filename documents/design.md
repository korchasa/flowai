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
  - **Documentation Subsystem:** Stores project state and memory.

## 3. Components

### 3.1 Skills (`.cursor/skills/`)

- **Purpose:** Provide specialized capabilities and workflows.
- **Interfaces:** Directories containing `SKILL.md` files.
- **Categories:**
  - `af-*`: Command-like skills (e.g., `af-check-and-fix`, `af-commit`).
  - `af-skill-*`: Practical guides (e.g., `af-skill-fix-tests`).
  - `rules-*`: Behavioral frameworks (e.g., `rules-tdd`).

### 3.2 Agents (`.cursor/agents/`)

- **Purpose:** Define specialized AI personas and roles.
- **Interfaces:** Markdown files in `.cursor/agents/`.
- **Key Agents:**
  - `af-commit.md`: Specialist in QA, documentation updates, and atomic commits.
  - `interviewer.md`: Specialist in gathering information.
  - `project-checker.md`: Specialist in running project checks.

### 3.3 Project Documentation (`documents/`)

- **Purpose:** Serve as the long-term memory of the project.
- **Interfaces:** Markdown files following SRS/SDS or Cline-bank schema.
- **Dependencies:** Updated by `af-update-docs`.

### 3.4 Project Maintenance and Benchmarking

- **Purpose:** Provide automated project maintenance, quality assurance, and
  performance evaluation.
- **Status:** Implemented - Deno tasks and scripts available.
- **Interfaces:** Deno tasks (`deno task check`, `deno task test`,
  `deno task dev`, `deno task bench`).
- **Dependencies:** Deno runtime, scripts in `./scripts/`.
- **Features:**
  - Automated code checking and validation.
  - Test execution framework.
  - Development server management.
  - Benchmark execution (`scripts/benchmarks/`).
  - **Cost Tracking**: Calculates financial cost of LLM usage per scenario and
    total run.
  - **Evaluation Metrics**: Uses Errors (critical failures), Warnings
    (non-critical failures), Steps, Time, and Cost for objective assessment.
  - **Evaluation Modes**:
    - **Quality**: Checklist-based verification (Pass/Fail).
    - **Model Selection**: Pairwise comparison (SBS) with ELO ratings.
    - **Version Comparison**: Delta analysis between versions.

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
