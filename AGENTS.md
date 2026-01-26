# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
- START PROCESSING USER INPUT BY READING THE DOCUMENTATION IN `./documents` AT
  BEGIN OF THE TASK.
- FINISH PROCESSING USER INPUT BY RUNNING `deno task check` AND FIXING ALL FOUND
  ERRORS, WARNINGS, AND LINTING PROBLEMS.
- YOU WILL BE REWARDED FOR FOLLOWING INSTRUCTIONS AND GOOD ANSWERS.
- DO NOT USE STUBS IN THE CODE, AS I HAVE NO FINGERS, AND THIS IS A TRAUMA.
- ALWAYS INDEPENDENTLY CHECK HYPOTHESES.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND
  PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- ANSWER IN LANGUAGE OF THE USER QUERY.
- WRITE ALL DOCUMENTATION IN ENGLISH IN INFORMATIONAL STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE
  NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.

## REMEMBER

AFTER EACH MEMORY RESET, YOU START COMPLETELY FROM SCRATCH. DOCUMENTATION IS THE
ONLY LINK TO PREVIOUS WORK. IT MUST BE MAINTAINED WITH ACCURACY AND CLARITY, AS
EFFECTIVENESS ENTIRELY DEPENDS ON ITS ACCURACY.

# Agent Reference: AssistFlow

## Tooling Stack

- Language: TypeScript.
- Runtime: Deno.
- Task runner: Deno tasks in `deno.json`.
- Test execution: `deno task test` via `scripts/task-test.ts`.
- Project checks: `deno task check` via `scripts/task-check.ts`.
- Dev runner: `deno task dev` via `scripts/task-dev.ts`.
- Benchmarking: `deno task bench` via `scripts/task-bench.ts`.

## Development Commands

- `deno task check` - Run all project checks via `scripts/task-check.ts`.
- `deno task test` - Run test task via `scripts/task-test.ts`.
- `deno task dev` - Run development task via `scripts/task-dev.ts`.
- `deno task bench` - Run agent benchmarks via `scripts/task-bench.ts`.

## Architecture

- `.cursor/skills/af-*/` stores chat-invoked workflows (Commands).
- `.cursor/skills/` stores other skills and how-to guides.
- `.cursor/agents/` stores autonomous sub-agents.
- `documents/` stores SRS/SDS and supporting documentation.
- `scripts/` stores Deno task scripts used by `deno task`.
    - `scripts/benchmarks/` stores agent benchmarking infrastructure.
      - `README.md` describes the benchmarking scheme, context assembly, and isolation.
      - `lib/` stores shared benchmarking logic and utilities.
    - `scenarios/` stores benchmark scenarios with their `mod.ts` and `fixture/` directories.

## Key Decisions

- Use Cursor skills and commands (implemented as skills) as the primary workflow system.
- Store project knowledge in `documents/` using SRS/SDS schema.
- Centralize verification through a single `deno task check` entry point.

## Benchmarking Principles

The benchmarking system (`scripts/task-bench.ts`) is designed to evaluate agent performance objectively. We use these benchmarks to verify the quality of our subagents and skills.

1. **Verify Side Effects, Not Just Output**:
   - The primary validation method must be checking the actual state of the
     sandbox environment (e.g., file existence, content, git status, logs).
   - Do not rely solely on parsing the agent's text response. An agent might say
     "I did it" without actually doing it.
   - **Example**: To verify a commit, check `git log` and `git status` in the
     sandbox, do not just look for a `git commit` string in the agent's output.

2. **Smart Scenarios**:
   - Scenarios should simulate real-world tasks with measurable outcomes.
   - Use "Evidence" collection (e.g., executing `git status` after the agent
     runs) to provide ground truth for the judge.

3. **Critical vs. Non-Critical Checks**:
   - **Critical**: Failures that mean the task was not completed (e.g., file not
     created, code not compilable). These result in a FAILED test.
   - **Non-Critical (Warnings)**: Stylistic or process preferences (e.g., "Did
     the agent check status before committing?"). These affect the score but do
     not necessarily fail the test if the outcome is correct.

4. **Repeatability**:
   - Scenarios must run in isolated, clean sandbox environments.
   - The evaluation logic must be robust enough to handle variations in model
     output (e.g., different command formatting) as long as the functional
     result is correct.

## DOCUMENTATION STRUCTURE AND RULES (directory `documents`)

### Hierarchy and purpose

- Product Vision (VISION): The starting point and most important document. Defines the "Why" and "For Whom". Answers the questions: what is the long-term goal and value.
- Software Requirements Specification (SRS): Is the primary source of truth for the project. Answers the questions: what are we doing and why. Depends on Product Vision.
- Software Design Specification (SDS): Is a source of project implementation details. Depends on Software Requirements Specification (SRS). Answers the question: how we do it.
- File Structure Map: A map of the project's file structure and its purpose.
- Whiteboard: A temporary notes file for in-progress notes.

### Documentation Rules

- Application MUST STRICTLY COMPLY with the VISION, SRS and SDS.
- VISION is read-only
- When adding a new requirement or updating existing ones: update SRS (if needed) -> update SDS -> implementation.
- Implemented requirements and acceptance criteria should be marked with [x] before the requirement and criterion title. Not implemented ones should be marked with [ ] or omitted.

### Software Requirements Specification (SRS) Format (file @documents/requirements.md)

```markdown
# Software Requirements Specification (SRS)

## 1. Introduction

- **Project description:**
- **Definitions and abbreviations:**

## 2. General description

- **System context:** (diagram or environment description)
- **Assumptions and constraints:**
- **Assumptions:**

## 3. Functional requirements

### 3.1 Requirement FR-1

- **Description:**
- **Use case scenario:** [with links to bdd/gherkin files, if used in project]
- **Acceptance criteria:**

### 3.2 Requirement FR-2

...

## 4. Non-functional requirements

- **Performance:**
- **Reliability:**
- **Security:**
- **Scalability:**
- **Availability/UX:**

## 5. Interfaces

- **APIs and integrations:**
- **Protocols and data formats:**
- **UI/UX constraints:**

## 6. Acceptance criteria

- The system is considered accepted if the following are met: ...
```

### Software Design Specification (SDS) Format (file @documents/design.md)

```markdown
# Software Design Specification (SDS)

## 1. Introduction

- **Document purpose:**
- **Relation to SRS:** (links to requirements)

## 2. System Architecture

- **Overview diagram:** (C4/UML/block diagram)
- **Main subsystems and their roles:**

## 3. Components

### 3.1 Component A

- **Purpose:**
- **Interfaces:** (API, input/output)
- **Dependencies:**

### 3.2 Component B

...

## 4. Data and Storage

- **Entities and attributes:**
- **ER diagram:**
- **Migration policies:**

## 5. Algorithms and Logic

- **Key algorithms:** (pseudocode or diagram)
- **Business rules:**

## 6. Non-functional Aspects

- **Scalability:**
- **Fault tolerance:**
- **Security:**
- **Monitoring and logging:**

## 7. Constraints and Trade-offs

- What has been simplified
- What has been deferred to future versions
```

### File Structure Map Format (file @documents/file_structure.md)

Parts of the file:

- tree-view tree(with file purposes and relationships) for:
  - root directory
  - sources
  - tests
- file organization patterns
- English language only

### Whiteboard Format (file @documents/whiteboard.md)

- Temporary notes
- Ongoing plans and progress marks.
- The only file for in-progress notes.
- Must be cleaned up after new session starts.
