# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- WRITE ALL DOCUMENTATION IN ENGLISH IN COMPRESSED STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.
- IF A FIX ATTEMPT FAILS, APPLY "5 WHY" ANALYSIS TO FIND THE ROOT CAUSE BEFORE RETRYING.
- IF ROOT CAUSE IS UNFIXABLE OR OUTSIDE CONTROL: STOP. DO NOT USE WORKAROUNDS. ASK USER FOR HELP.
- IF ISSUE PERSISTS AFTER 2 ATTEMPTS: STOP. OUTPUT "STOP-ANALYSIS REPORT" (STATE, EXPECTED, 5-WHY CHAIN, ROOT CAUSE, HYPOTHESES). WAIT FOR USER HELP.
---
- REMEMBER, AGENTS AND SKILLS IN THE catalog/ FOLDER ARE THE PRODUCT OF THIS PROJECT. FOR USERS, THEY WILL BE STORED IN .cursor/. DO NOT CONFUSE AGENTS AND SKILLS AS A PRODUCT WITH YOUR OWN AGENTS AND SKILLS.
- ANY CHANGES TO SKILLS MUST BE TESTED THROUGH BENCHMARKS, LIKE TDD FOR CODE.


## Project Information

- Project Name: AssistFlow

## Project Vision

### Vision Statement

A collection of Cursor skills and agents, designed to standardize work across various software development contexts.

### Target Audience

Developers using Cursor IDE

### Problem Statement

AI models have a limited context window and lose information between chat sessions, leading to inconsistent development practices.

### Solution & Differentiators

Uses explicit workflows (skills), rigid verification (deno task check), and persistent memory through comprehensive documentation to maintain context and quality. 

### Risks & Assumptions

Assumes users will follow the defined workflows and keep documentation up-to-date.

## Project tooling Stack

- Python
- Deno
- TypeScript

## Development Commands

- `deno task start` (check deno.json)
- `deno task check` (check deno.json)
- `deno task test` (check deno.json)

## Architecture

- `catalog/skills/`: Source of truth for skills (logical Commands and Skills)
- `catalog/agents/`: Source of truth for agents
- `documents/`: SRS/SDS and supporting documentation
- `scripts/`: Deno task scripts

## Terminology (agentskills.io)

All workflows are implemented as **Skills** according to the [agentskills.io](https://agentskills.io/home) standard (folders with `SKILL.md`). Logically, they are divided into:
- **Commands** (`af-*`): High-level task workflows (e.g., `/af-commit`). Executed by the agent upon user request, but usually not invoked by the agent itself as a tool.
- **Skills** (`af-skill-*`): Procedural knowledge and specialized capabilities (e.g., `af-skill-draw-mermaid`). Can be discovered and used by agents to perform specific sub-tasks.

## Key Decisions

- Use Cursor skills and commands as the primary workflow system
- Store project knowledge in `documents/` using SRS/SDS schema
- Centralize verification through `deno task check`

## DOCS STRUCTURE & RULES (`documents/`)

**CRITICAL:** MEMORY RESETS. DOCS = ONLY LINK TO PAST. MAINTAIN ACCURACY.

### Hierarchy
1. **`AGENTS.md`**: "Why" & "For Whom". Long-term goal/value. READ-ONLY.
2. **Software Requirements Specification (SRS)** (`documents/requirements.md`): "What" & "Why". Source of truth. Depends on VISION.
3. **Software Design Specification (SDS)** (`documents/design.md`): "How". Implementation details. Depends on SRS.
4. **Whiteboard** (`documents/whiteboard.md`): Temporary notes.

### Rules
- **STRICT COMPLIANCE**: AGENTS.md, SRS, SDS.
- **Workflow**: New req -> Update SRS -> Update SDS -> Implement.
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
...
## 4. Non-Functional
- **Perf/Reliability/Sec/Scale/UX:**
## 5. Interfaces
- **API/Proto/UI:**
## 6. Acceptance
- **Criteria:**
```

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
```

### Whiteboard Format (`documents/whiteboard.md`)
- Temp notes/plans. Clean up after session.

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
