# Analysis of Spec Kit Principles and Techniques (tmp/spec-kit)

This document summarizes the key principles and techniques used in the Spec Kit project for managing AI agents, their instructions, and workflows.

## Principles and Techniques

### 1. Specification-Driven Development (Inversion of Power)

- **Description**: A fundamental philosophy where specifications are executable artifacts that generate the implementation.
- **How it works**:
  1. **Power Inversion**: Code is secondary to the specification. A change in the program starts with updating the specification (PRD), not the code.
  2. **Transformation, not Coding**: The development process turns into a chain of transformations:
     `Idea -> Specification (/specify) -> Technical Plan (/plan) -> Task List (/tasks) -> Code`.
  3. **Executability**: Specifications are written with such precision that they can serve as unambiguous instructions for system generation.
- **Framework Implementation**: A chain of commands `/speckit.specify` -> `/speckit.plan` -> `/speckit.tasks` -> `/speckit.implement`. Each command consumes the artifact of the previous one and generates the next, more detailed one.
- **Proof**: `spec-driven.md`: "Specifications do not serve the code - code serves the specifications."

#### Adaptation Options

**Flexible**: Use the `/engineer-requirements` command to generate the specification post-factum or in parallel, not blocking fast prototypes, but requiring updates before release.

### 2. Project Constitution

- **Description**: A set of immutable architectural and ethical rules governing all decisions in the project.
- **How it works**:
  1. **Architectural DNA**: The constitution (`constitution.md`) contains articles (e.g., "Library-First", "CLI-Interface") that define the character of the entire system.
  2. **Enforced Compliance**: In the planning template (`plan.md`), "Phase Gates" are embedded that oblige the AI agent to explicitly confirm that the proposed solution does not violate the articles of the constitution.
  3. **Stability**: Ensures code consistency, even if it is written by different AI models or different developers at different times.
- **Framework Implementation**: The `memory/constitution.md` file is a "sacred" text referred to by all commands. The `/speckit.analyze` command checks the project for compliance with constitutional articles.
- **Proof**: `memory/constitution.md`, `spec-driven.md` (section "Constitutional Foundation").

#### Adaptation Options

1. **Integration**: Add the contents of `memory/constitution.md` to the existing Product Vision in `AGENTS.md` as an "Immutable Principles" section, making it part of the mandatory context.

### 5. Management of Forced Uncertainty

- **Description**: A mechanism to prevent hallucinations by explicitly marking gaps in information.
- **How it works**:
  1. **No Guessing**: Instructions in templates strictly forbid the agent from making assumptions. If the user's prompt lacks data, the agent MUST use the marker `[NEEDS CLARIFICATION: question]`.
  2. **Progress Blocking**: Planning and implementation commands scan files for these markers. If markers are found, the process stops until they are resolved by the user.
  3. **Limits**: Limiting the number of questions (e.g., no more than 3-5 at a time) to avoid overwhelming the user.
- **Framework Implementation**: The `/speckit.clarify` command automates the process of resolving these markers, asking questions one by one. The `check-prerequisites.sh` script blocks the execution of other commands if markers are not removed.
- **Proof**: `templates/commands/specify.md`, `templates/commands/plan.md`.

#### Adaptation Options

1. **Strict Marker**: Oblige the agent to use `[UNKNOWN]` or `[?]` in plans and documents if confidence is below 90%, and stop.
2. **Questions Section**: In the `/plan` template, add a mandatory "Open Questions" section that the agent must fill in before starting work.
3. **Validator**: Add a check to the script that looks for such markers and prevents committing code until they are resolved (removed).

### 6. Phase Gates

- **Description**: Quality control points that must be passed before moving to the next stage of development.
- **How it works**:
  1. **Pre-Implementation Gates**: Critical checks are highlighted in the technical plan (Simplicity Gate, Gate against redundant abstractions).
  2. **Explicit Justification**: The agent must not just check a box, but justify (in the Complexity Tracking section) why a particular solution was chosen, especially if it seems complex.
  3. **Automatic Rejection**: If a "gate" is not passed (e.g., the solution violates an article of the constitution), the command terminates with an error.
- **Framework Implementation**: Section `### Phase -1: Pre-Implementation Gates` in the `plan-template.md` template. The agent is obliged to fill it in before generating `data-model.md` and contracts.
- **Proof**: `templates/commands/plan.md` (section "Phase -1: Pre-Implementation Gates").

#### Adaptation Options

1. **Explicit Checkboxes**: Include a "GATES" list at the beginning of each plan generated by `/plan`. The agent must check `[x]` before proceeding.
2. **Command Gate**: Split the process into two commands: `/plan` (only plans) and `/execute` (accepts the plan only after an explicit "OK" from the user acting as a gate).
3. **Auto-Gate**: Write a plan validation script (markdown linter) that checks for the presence of necessary sections and the absence of "filler" before allowing execution.

### 8. Template-Based Quality

- **Description**: Using structured Markdown templates to constrain LLM behavior.
- **How it works**:
  1. **Templates as Prompts**: Each file (`spec.md`, `plan.md`) has a rigid structure that "guides" AI thinking. For example, the specification template forbids mentioning technologies, forcing a focus on "WHAT" and "WHY".
  2. **Self-Check**: Checklists (Requirement Completeness, UX Quality) are built into the templates, which the AI must fill in itself for self-audit.
  3. **Hierarchy of Detail**: Templates prescribe moving redundant details (code, algorithms) to separate files, keeping the main document readable.
- **Framework Implementation**: The `templates/` folder contains reference structures for all documents. Commands copy these templates into the feature's working directory (`specs/[feature-branch]/`).
- **Proof**: `templates/spec-template.md`, `templates/plan-template.md`.

#### Adaptation Options

1. **Template Library**: Create a `.cursor/templates/` folder and a `/template <name>` command that inserts the required skeleton into the current file.
2. **Built-in Templates**: "Hardcode" document structures directly into the system prompts of commands (`/do`, `/plan`) so that the agent always generates the correct format without extra actions.
3. **Structure Linting**: Use `deno task check` to check not only the code but also the compliance of Markdown files with given templates (headers, sections).

### 10. TDD Imperative

- **Description**: An uncompromising requirement to write tests before implementation code.
- **How it works**:
  1. **Mandatory**: Article III of the constitution makes TDD not a recommendation, but a law.
  2. **Task Order**: The task list generator (`/tasks`) always puts creating contracts and tests above tasks for writing business logic.
  3. **Red-Phase Validation**: The agent must first run tests and show that they fail (Red), and only then proceed to the code.
- **Framework Implementation**: The `/speckit.tasks` command forces the creation of tests before implementation in each phase. The `tasks-template.md` template requires specifying testing criteria for each task.
- **Proof**: `memory/constitution.md` (Article III), `templates/commands/tasks.md`.

#### Adaptation Options

1. **Red-Green-Refactor**: Strictly require the agent to first create a failing test, run it (show the error), and only then write the code.
2. **Test-First Plan**: In the `/plan` command, require first describing test cases as pseudocode or a list of checks, and only then the architecture.
3. **Post-tests (Relaxed)**: Allow writing code and tests in one chunk/commit, but block the PR if test coverage has dropped (coverage check).

### 11. Task Parallelism (marker [P])

- **Description**: Explicit identification of tasks that can be performed simultaneously.
- **How it works**:
  1. **Dependency Analysis**: The `/tasks` command analyzes the task list and marks with a `[P]` symbol those that do not share files with other unfinished tasks.
  2. **Multi-agent Capability**: This marker allows distributing tasks between different AI agents or Composer windows without the risk of code conflicts.
  3. **Grouping**: Tasks are grouped into "phases", within which tasks with `[P]` can be performed in any order.
- **Framework Implementation**: The `/speckit.tasks` command logic automatically sets `[P]` for tasks affecting different files. In `tasks.md`, examples of commands for parallel execution are generated.
- **Proof**: `templates/commands/tasks.md` (section "Checklist Format").

#### Adaptation Options

1. **Async-plan**: Use an `[ASYNC]` marker for tasks that can be sent to another agent window (Composer) or a background process.
2. **Grouping**: Instead of markers, simply group independent tasks into "Stage 1", "Stage 2" blocks, implying parallelism within the stage.
3. **Do not use**: If work is done in a single thread with one agent, simply ignore this concept to avoid overloading the plan with extra symbols.

### 12. Unit Tests for Requirements ("Unit Tests for English")

- **Description**: Applying testing principles to the requirements documentation itself.
- **How it works**:
  1. **Checklists as Tests**: The `/checklist` command generates specialized check files (e.g., `security.md`, `ux.md`) for a specific feature.
  2. **Pre-coding Validation**: These checklists must be passed (all items marked `[x]`) BEFORE starting to write code.
  3. **Quantitative Assessment**: A requirement is considered high quality if it is measurable and does not contain "filler".
- **Framework Implementation**: The `/speckit.checklist` command creates files in the `checklists/` folder. The `/speckit.implement` command checks the status of these checklists and requests confirmation if they are not filled in.
- **Proof**: `templates/commands/checklist.md`.

#### Adaptation Options

1. **Review-command**: Create a `/review-specs` command that runs the current requirements document through a strict checklist (SMART criteria) and provides an error report.
2. **LLM-Linter**: Use a separate LLM call to "critique" requirements before they are accepted for work.
3. **Formalization**: Rewrite requirements in Gherkin format (Given-When-Then) so they are as close to tests as possible and verifiable.

### 13. Semantic Inventory (Requirements Inventory)

- **Description**: Breaking down requirements into a flat, searchable list.
- **How it works**:
  1. **Slugging**: Each atomic requirement from the text is turned into a unique ID (slug), e.g., `user-can-reset-password`.
  2. **Coverage Matrix**: The `/analyze` command builds a table where each requirement (ID) is mapped to a specific item in the task list (`tasks.md`).
  3. **Gap Detection**: If a requirement has no corresponding tasks, it is marked as a "Coverage Gap".
- **Framework Implementation**: The `/speckit.analyze` command builds `Internal Semantic Models` and outputs a `Coverage Summary Table` directly into the chat.
- **Proof**: `templates/commands/analyze.md` (section "Build Semantic Models").

#### Adaptation Options

1. **Requirement IDs**: Implement a tagging system (REQ-001, REQ-002) in documentation and require them to be specified in commits and tests (Traceability Matrix).
2. **Keyword Search**: Instead of strict IDs, use unique terms/phrases and `grep` to find their implementation.
3. **Simplified List**: Maintain a simple `features.md` with a list of features and their status (Planned, In Progress, Done), without complex indexing.

### 14. Progressive Disclosure of Context

- **Description**: A strategy for managing the agent's context window by loading only relevant information.
- **How it works**:
  1. **Minimalism**: Commands do not read the entire project at once. First, only headers or tables of contents are read.
  2. **Lazy Loading**: Details (Data Model, API Contracts) are loaded only when the agent reaches a specific phase of planning or implementation.
  3. **Focus on Changes**: Files not affected by the current branch/task are ignored.
- **Framework Implementation**: The `check-prerequisites.sh` and `setup-plan.sh` scripts return only necessary paths. The `/speckit.analyze` command uses `Progressive Disclosure` to load artifacts as needed.
- **Proof**: `templates/commands/analyze.md`, `templates/commands/checklist.md`.

#### Adaptation Options

1. **Cursor ignore**: Actively use and update `.cursorignore` to hide irrelevant files (locks, old logs, assets).
2. **@Mention policy**: Train the agent and user to explicitly mention only needed files (`@file`), not entire folders, to save tokens.
3. **RAG**: Connect an external knowledge base (vector search) for large projects so the agent can find relevant documentation snippets itself.

### 15. Handoff Protocol

- **Description**: A formal mechanism for transitioning between different agents or stages of the workflow.
- **How it works**:
  1. **Metadata (Frontmatter)**: Each command template contains a `handoffs` section specifying which agent should pick up the work and with what prompt.
  2. **Command Chains**: Completing `/specify` automatically suggests running `/clarify` or `/plan`, passing accumulated context through files.
  3. **Explicit Instructions**: The protocol ensures that the next agent receives clear inputs rather than having to relearn the project from scratch.
- **Framework Implementation**: `handoffs` sections in the YAML frontmatter of all files in `.cursor/commands/`. They define "Next Steps" for automating workflows.
- **Proof**: `handoffs` section in command templates (e.g., from `specify.md` to `plan.md`).

#### Adaptation Options

1. **Next Steps**: Oblige the agent to write a "Next Steps" block at the end of each message with the exact command to continue (e.g., "Run `/check` now").
2. **Checkpoints**: Save state to a `state.json` file between sessions so the next agent run picks up the context.
3. **End-to-end ID**: Generate a session/task ID and write it in logs to link actions of different agents/sessions.

### 16. Preservation of Manual Edits

- **Description**: Merging automatic generation with manual editing by a human.
- **How it works**:
  1. **Protected Blocks**: Marker comments `<!-- MANUAL ADDITIONS START/END -->` are used in generated files (e.g., `AGENTS.md`).
  2. **Smart Scripts**: Context update scripts (e.g., `update-agent-context.sh`) cut out content between these markers, save it to a temporary file, and re-insert it after generating new content.
  3. **Hybrid Ownership**: This allows the AI to update technical details (command list, versions) without overwriting unique instructions added by the human developer.
- **Framework Implementation**: The `scripts/bash/update-agent-context.sh` script uses temporary files and `sed` to transfer `MANUAL ADDITIONS` blocks from the old version of the file to the new one during each update.
- **Proof**: `templates/agent-file-template.md`, `scripts/bash/update-agent-context.sh`.

#### Adaptation Options

1. **Protected Blocks**: Introduce marker comments `<!-- PROTECTED --> ... <!-- /PROTECTED -->`, within which the agent is not allowed to change text.
2. **File Separation**: Keep auto-generated content in some files (`foo.gen.ts`) and manual code in others (`foo.ts`), importing the former into the latter.
3. **Git Diff Review**: Always show the user a diff before overwriting a file and ask for confirmation if manual edits are affected.

### 17. Terminology Drift Detection

- **Description**: Automatic verification of naming convention consistency across different artifacts.
- **How it works**:
  1. **Linguistic Audit**: The `/analyze` command compares entities in `spec.md`, `plan.md`, and `tasks.md`.
  2. **Synonym Search**: A flag is raised if the same concept is named differently in different files (e.g., `Account` in the specification turned into `User` in the code).
  3. **Normalization**: The agent suggests choosing one canonical term and updating all documents for uniformity.
- **Framework Implementation**: The `/speckit.analyze` command performs `Detection Pass F: Inconsistency`, analyzing `Terminology drift` across the entire feature artifact tree.
- **Proof**: `templates/commands/analyze.md` (section "Inconsistency").

#### Adaptation Options

1. **Glossary**: Create a `GLOSSARY.md` and include it in the agent's system prompt with the instruction "Use strictly these terms".
2. **Rule Linter**: Write a custom rule for a linter (ESLint/other) that forbids the use of synonyms in code (e.g., forbidding `usr`, requiring `user`).
3. **Periodic Audit**: Once a month, run a task to review documentation and code for discrepancies (via LLM).

### 18. Ignore Enforcement

- **Description**: Ensuring environment hygiene before starting implementation.
- **How it works**:
  1. **Stack Detection**: The `/implement` command analyzes the chosen technologies from `plan.md`.
  2. **Auto-generation of .ignore**: A script automatically creates or supplements `.gitignore`, `.dockerignore`, `.cursorignore` files with a set of patterns specific to that stack (e.g., `node_modules` for JS or `__pycache__` for Python).
  3. **Clean Context**: This ensures that the AI will not try to index junk files, saving tokens and preventing errors.
- **Framework Implementation**: Section `Project Setup Verification` in the `/speckit.implement` command. The script checks for the presence of `.gitignore` and other files, and adds `Essential Patterns` to them from a list in the template.
- **Proof**: `templates/commands/implement.md` (section "Project Setup Verification").

#### Adaptation Options

1. **Check-script**: Add a check to `deno task check` for the presence and non-emptiness of `.gitignore`, `.cursorignore`, and other ignore files.
2. **Repo Template**: Include ideal ignore files in the project creation template so they are there from the beginning.
3. **Cerberus Agent**: Instruction to the agent: "If you see me asking to read `node_modules`, refuse and suggest adding it to ignore".

### 19. Autonomous Branching and Numbering

- **Description**: Automated organization of feature branches and directories.
- **How it works**:
  1. **History Scanning**: When launching `/specify`, the script checks existing branches and folders in `specs/`.
  2. **Index Calculation**: The maximum current feature number (e.g., 004) is found and number N+1 (005) is automatically suggested.
  3. **Infrastructure Creation**: The script itself does `git checkout -b 005-feature-name` and creates the folder `specs/005-feature-name/`, saving the developer from routine.
- **Framework Implementation**: The `scripts/bash/create-new-feature.sh` script performs `git fetch --all`, looks for the maximum number in branch and folder names, and creates a new branch and folder structure.
- **Proof**: `templates/commands/specify.md` (section "Check for existing branches").

#### Adaptation Options

1. **Git Flow**: Automate the creation of `feature/task-id-description` branches via a git wrapper script.
2. **Task Folders**: Create a folder for each major task in `tasks/task-id/` with all documentation and context to isolate work.
3. **Manual Control**: Leave naming to the user's discretion but require the branch name to appear in commits (convention).

### 20. Sequential Questioning Loop

- **Description**: An interactive clarification process limited to one question at a time.
- **How it works**:
  1. **One at a Time**: Instead of a list of 10 questions, the `/clarify` command asks exactly ONE question.
  2. **Recommended Answer**: For each question, the AI suggests options (A, B, C) and immediately highlights a "Recommended" option with a brief justification.
  3. **Quick Choice**: The user only needs to answer "yes" or "A" to make a decision, which sharply accelerates the specification clarification process.
- **Framework Implementation**: The `/speckit.clarify` command implements a `Sequential questioning loop`. It reads `spec.md`, finds uncertainties, and conducts a dialogue until they are exhausted (but no more than 5 questions per session).
- **Proof**: `templates/commands/clarify.md` (section "Sequential questioning loop").

#### Adaptation Options

1. **Question Limit**: A rigid rule in the system prompt: "Ask no more than 1 question at a time. Wait for a response."
2. **Interactive Mode**: A special `/interview` command that puts the agent into interviewer mode for gathering requirements.
3. **Questionnaire**: Instead of a chat, generate a `questions.md` file with a checklist that the user fills in asynchronously and then feeds back to the agent.
