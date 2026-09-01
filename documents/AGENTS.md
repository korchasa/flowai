# Documents

SRS (`requirements.md`), SDS (`design.md`) and task files (`tasks/`). The root `AGENTS.md` holds the documentation hierarchy, traceability and task-file rules; this file holds the section templates the SRS and SDS follow.

### SRS Format (`documents/requirements.md`)

- **Requirement numbering**: Exactly 2 levels — `FR-x` and `FR-x.y`. No `FR-x.y.z`.
  Acceptance criteria under `FR-x.y` are plain bullet items (no FR prefix).
- **Sub-FR heading & coverage caveat**: sub-FRs use `#### FR-PARENT.SUFFIX` (4 hashes — the dominant form for the 50+ sub-FRs, e.g. `FR-DIST.SYNC`, `FR-AI-CODE-REVIEW.EXISTING-SUITE`). `check-fr-coverage.ts` matches ONLY top-level `### FR-` (regex `/^###\s+FR-/`) and is NOT part of `deno task check`, so no `####` sub-FR is machine-checked by it. Sub-FR acceptance is enforced only at review time (FR Coverage Audit) or by manual anchor grep — a green `deno task check` does not imply a sub-FR was covered.

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
- **Acceptance verified by acceptance tests:** `scenario-id-1`, `scenario-id-2`
  <!-- or: **Acceptance:** tests/foo_test.ts::test_bar | `deno task check-x` | manual — <reviewer> -->
- **Status:** [ ] / [x]
---

## 4. Non-Functional

- **Perf/Reliability/Sec/Scale/UX:**

## 5. Interfaces

- **API/Proto/UI:**

## 6. Acceptance

- **Criteria:**

````

**Evidence keyword caveat (`scripts/check-srs-evidence.ts`)**: Any line in SRS containing the literal `Evidence:` plus a path to a `*_test.ts` file is checked unconditionally — the file MUST exist on disk, regardless of whether the parent FR is `[ ]` or `[x]`. For forward-declared `[ ]` FRs whose tests are not yet authored, formulate `**Acceptance:**` as prose (`deno test <path> (to be authored)` or `manual — <reviewer>`) and keep per-step DoD with `Evidence:` lines in the linked task file, NOT in SRS. The validator does NOT distinguish FR status; a stale `[ ]` FR pointing at a future test fails `deno task check` on every run.

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
