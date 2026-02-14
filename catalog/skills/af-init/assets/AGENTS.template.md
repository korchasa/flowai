# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
- ALWAYS READ THE DOCUMENTATION BEFORE STARTING WORK.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- WRITE ALL DOCUMENTATION IN ENGLISH IN COMPRESSED STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.
- THE CODE MUST FOLLOW THE "FAIL FAST, FAIL CLEARLY" STRATEGY UNLESS THE USER HAS REQUESTED OTHERWISE.
- IF A FIX ATTEMPT FAILS, APPLY "5 WHY" ANALYSIS TO FIND THE ROOT CAUSE BEFORE RETRYING.
- IF ROOT CAUSE IS UNFIXABLE OR OUTSIDE CONTROL: STOP. DO NOT USE WORKAROUNDS. ASK USER FOR HELP.
- IF ISSUE PERSISTS AFTER 2 ATTEMPTS: STOP. OUTPUT "STOP-ANALYSIS REPORT" (STATE, EXPECTED, 5-WHY CHAIN, ROOT CAUSE, HYPOTHESES). WAIT FOR USER HELP.
- WHEN EDITING CI/CD, ALWAYS CHECK LOCALLY FIRST.

---
{{PROJECT_RULES}}

## Project Information
- Project Name: {{PROJECT_NAME}}

## Project Vision
{{PROJECT_VISION}}

## Project tooling Stack
{{TOOLING_STACK}}

## Development Commands

### Standard Interface
- `check` - The main command for comprehensive project verification. Performs the following steps:
  - build the project
  - comment-scan: "TODO", "FIXME", "HACK", "XXX", debugger calls, linters and formatters suppression
  - code formatting check
  - static code analysis
  - runs all project tests
- `test <path>` - Runs a single test.
- `dev` - Runs the application in development mode with watch mode enabled.
- `prod` - Runs the application in production mode.

### Detected Commands
{{DEVELOPMENT_COMMANDS}}

### Command Scripts
{{COMMAND_SCRIPTS}}

## Architecture
{{ARCHITECTURE}}

## Key Decisions
{{KEY_DECISIONS}}

## Planning Rules

- **Environment Side-Effects**: Changes to infra/DB/external services → plan MUST include migration/sync/deploy steps.
- **Verification Steps**: Plan MUST include specific verification commands (tests, validation tools, connectivity checks).
- **Functionality Preservation**: Refactoring/modifications → run existing tests before/after; add new tests if coverage missing.
- **Data-First**: Integration with external APIs/processes → inspect protocol & data formats BEFORE planning.
- **Architectural Validation**: Complex logic changes → visualize event sequence (sequence diagram/pseudocode).
- **Variant Analysis**: Non-obvious path → propose variants with Pros/Cons. Quality > quantity. 1 variant OK if path is clear.
- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.
- **Proactive Resolution**: Before asking user, exhaust available resources (codebase, docs, web) to find the answer autonomously.

## DOCS STRUCTURE & RULES (`documents/`)

**CRITICAL:** MEMORY RESETS. DOCS = ONLY LINK TO PAST. MAINTAIN ACCURACY.

### Hierarchy
1. **`AGENTS.md`**: "Why" & "For Whom". Long-term goal/value. READ-ONLY.
2. **Software Requirements Specification (SRS)** (`documents/requirements.md`): "What" & "Why". Source of truth. Depends on VISION.
3. **Software Design Specification (SDS)** (`documents/design.md`): "How". Implementation details. Depends on SRS.
4. **Whiteboard** (`documents/whiteboard.md`): Temporary notes.

### Rules
- **STRICT COMPLIANCE**: AGENTS.md, SRS, SDS.
- **Workflow**: New/Updated req -> Update SRS -> Update SDS -> Implement.
- **Status**: `[x]` = implemented, `[ ]` = pending.

### SRS Format (`documents/requirements.md`)
```markdown
# SRS
## 1. Intro
- **Desc:**
- **Def/Abbr:**
## 2. General
- **Context:**
- **Assumptions/Constraints:**
## 3. Functional Reqs
### 3.1 FR-1
- **Desc:**
- **Scenario:**
- **Acceptance:**
---

## 4. Non-Functional

- **Perf/Reliability/Sec/Scale/UX:**

## 5. Interfaces

- **API/Proto/UI:**

## 6. Acceptance

- **Criteria:**

````
### SDS Format (`documents/design.md`)
```markdown
# SDS
## 1. Intro
- **Purpose:**
- **Rel to SRS:**
## 2. Arch
- **Diagram:**
- **Subsystems:**
## 3. Components
### 3.1 Comp A
- **Purpose:**
- **Interfaces:**
- **Deps:**
...
## 4. Data
- **Entities:**
- **ERD:**
- **Migration:**
## 5. Logic
- **Algos:**
- **Rules:**
## 6. Non-Functional
- **Scale/Fault/Sec/Logs:**
## 7. Constraints
- **Simplified/Deferred:**
````

### Whiteboard file (`documents/whiteboard.md`)

- Temp notes/plans. Clean up after session.
- Issue or plan in GODS format.

#### GODS Format

```markdown
# [Task Title]

## Goal

[Why? Business value.]

## Overview

### Context

[Full problematics, pain points, operational environment, constraints, tech debt, external URLs, @-refs to relevant files/docs.]

### Current State

[Technical description of existing system/code relevant to task.]

### Constraints

[Hard limits, anti-patterns, requirements (e.g., "Must use Deno", "No external libs").]

## Definition of Done

- [ ] [Criteria 1]
- [ ] [Criteria 2]

## Solution

[Detailed step-by-step for SELECTED variant only. Filled AFTER user selects variant.]
```

### Compressed Style Rules (All Docs)

- **No History**: No changelogs.
- **English Only(Except whiteboard.md)**.
- **Summarize**: Extract facts -> compress. No loss of facts.
- **Essential Info**: No fluff. High-info words.
- **Compact**: Lists, tables, YAML, Mermaid.
- **Lexicon**: No stopwords. Short synonyms.
- **Entities**: Abbreviate after 1st use.
- **Direct**: No filler.
- **Structure**: Headings/sections.
- **Symbols**: Replace words with symbols/nums.

## CODE DOCS

- **Module**: `AGENTS.md` (responsibility/decisions).
- **Comments**: Class/Method/Func (JSDoc/GoDoc). Why/How > What. No trivial comments.

## TDD FLOW

1. **RED**: Write test (`deno test <id>`).
2. **GREEN**: Pass test (`deno test <id>`).
3. **REFACTOR**: Improve code/tests. No behavior change. (`deno test <id>`).
4. **CHECK**: `deno fmt && deno lint && deno test`. Fix all.

### Test Rules

- Tests in same pkg. Private methods OK.
- Code ONLY to fix tests/issues.
- NO STUBS. Real code.
- Run ALL tests before finish.
