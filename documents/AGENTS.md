# Documentation Rules

Your memory resets between sessions. Documentation is the only link to past decisions and context. Keeping it accurate is not optional — stale docs actively mislead future sessions.

## Hierarchy
1. **`AGENTS.md`**: "Why" & "For Whom". Long-term goal and value proposition. Read-only reference.
2. **Software Requirements Specification (SRS)** (`documents/requirements.md`): "What" & "Why". Source of truth for requirements. Depends on vision.
3. **Software Design Specification (SDS)** (`documents/design.md`): "How". Implementation details. Depends on SRS.
4. **Tasks** (`documents/tasks/<YYYY-MM-DD>-<slug>.md`): Temporary plans and notes. One file per task or session.
5. **IDE Differences** (`documents/ides-difference.md`): Reference. Cross-IDE capability comparison (primitives, hooks, agents, MCP). Informs FR-HOOK-DOCS-FR-IDE-SCOPE.
6. **`README.md`**: Public-facing overview. Derived from AGENTS.md + SRS + SDS. Installation, usage, pack/skill catalog, project structure. Keep in sync with framework state.

## Rules
- Follow AGENTS.md, SRS, and SDS strictly — they define what the project is and how it works.
- Workflow for changes: new or updated requirement -> update SRS -> update SDS -> implement. Skipping steps leads to docs-code drift.
- Status markers: `[x]` = implemented, `[ ]` = pending.
- **Traceability**: Code references requirements, not the reverse. Three mechanisms:
  1. **Code-evidenced**: Source files contain `// FR-<ID>` (TS/JS) or `# FR-<ID>` (YAML/shell)
     comments near implementing logic. Validated by `deno task check` (`check-traceability.ts`).
  2. **Benchmark-evidenced**: SRS states "Acceptance verified by benchmarks: <list>".
     No code comments needed — benchmarks ARE the evidence.
  3. **Structural**: Requirement proven by file/directory existence.
     No code comments needed — `[x]` status + description is sufficient.
- **No `Evidence:` paths in SRS.** Traceability lives in code, not in docs.

## SRS Format (`documents/requirements.md`)

- **Requirement numbering**: Exactly 2 levels — `FR-x` and `FR-x.y`. No `FR-x.y.z`.
  Acceptance criteria under `FR-x.y` are plain bullet items (no FR prefix).

```markdown
# SRS
## 1. Intro
- **Desc:**
- **Def/Abbr:**
## 2. General
- **Context:**
- **Assumptions/Constraints:**
## 3. Functional Reqs
### 3.1 FR-CMD-EXEC
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
## SDS Format (`documents/design.md`)
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

## Tasks (`documents/tasks/`)

- One file per task or session: `<YYYY-MM-DD>-<slug>.md` (kebab-case slug, max 40 chars).
- Examples: `2026-03-24-add-dark-mode.md`, `2026-03-24-fix-auth-bug.md`.
- Do not reuse another session's task file — create a new file. Old tasks provide context but may contain outdated decisions.
- Use GODS format (see below) for issues and plans.
- Directory is gitignored. Files accumulate — this is expected.

### GODS Format

```markdown
---
implements:
  - FR-XXX
---
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

## Compressed Style Rules (All Docs)

- No changelogs — docs reflect current state, not history.
- English only (except tasks, which may use the user's language).
- Summarize by extracting facts and compressing — no loss of information, just fewer words.
- Every word must carry meaning — no filler, no fluff, no stopwords where a shorter synonym works.
- Prefer compact formats: lists, tables, YAML, Mermaid diagrams.
- Abbreviate terms after first use — define once, abbreviate everywhere.
- Use symbols and numbers to replace words where unambiguous (e.g., `->` instead of "leads to").
