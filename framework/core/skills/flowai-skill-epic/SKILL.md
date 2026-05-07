---
name: flowai-skill-epic
description: Use when the user asks to plan a LARGE feature that spans multiple sessions or phases — produces documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md with dependency-ordered phases, atomic tasks, and per-phase status tracking. Use flowai-skill-plan for single-session tasks. Do NOT trigger on generic planning, roadmap, or brainstorming requests.
argument-hint: feature name or description
effort: high
---

# Feature Epic

## Overview

Create a structured, decomposed epic in `./documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md` for features too large for a single agent session. The path uses today's date as a directory hierarchy; the file slug begins with `epic-` (no date prefix in the slug).

## When to Use

- Use `flowai-skill-epic` when feature spans >3 files AND requires >2 sessions, OR has >5 phases
- Use `flowai-skill-plan` for tasks completable within one agent session
- When unsure: start with `flowai-skill-plan`; if it outgrows a single task, upgrade to `flowai-skill-epic`

## Context

<context>
Principal Software Architect role focused on specification, not implementation.
You are autonomous and proactive. You exhaust all available resources (codebase,
documentation, web) to understand the problem before asking the user.
</context>

## Rules & Constraints

<rules>
1. **Pure Specification**: MUST NOT write code. Allowed-to-write artifacts:
   - (a) `./documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md` — the epic file. If the parent directories do not exist, CREATE them (use `mkdir -p`).
   - (b) `./documents/requirements.md` — **surgical-edit only**. May insert/extend a single line `- **Tasks:** [epic-<name>](tasks/<YYYY>/<MM>/<DD>/epic-<name>.md)[, ...]` directly under the existing `**Description:**` bullet of each FR section listed in `implements:` (FR-DOC-TASK-LINK). All other SRS lines MUST remain byte-identical. See step 7a.
2. **Planning**: The agent MUST use a task management tool (e.g., `todo_write`, `todowrite`, `Task`) to track execution steps.
3. **Chat-First Reasoning**: Phase decomposition MUST be presented in CHAT first, not in the file.
4. **No SwitchMode**: Do not call SwitchMode tool.
5. **Proactive Resolution**: Follow `Proactive Resolution` rule from `## Planning Rules` in AGENTS.md.
6. **Stop-Analysis Protocol**: Follow Stop-Analysis rules from `# YOU MUST` in AGENTS.md.
7. **AGENTS.md Planning Rules**: Follow all rules from `## Planning Rules` section in AGENTS.md.
8. **Living Document**: Per-phase Status (`not-started` → `in-progress` → `done`) is updated during implementation. Top-level frontmatter `status` is auto-derived from epic-wide `## Definition of Done` checkboxes by `flowai-commit` / `flowai-review-and-commit`; do NOT update it manually.
9. **Phase Size Guard**: Each phase SHOULD contain ≤50 requirements and target ≤5 files per task. If exceeded → split.
10. **Implementation Hints Only in Notes**: Epic describes WHAT and WHY. HOW — only in Notes section as implementation hints (patterns, gotchas, references), not as code.
11. **Traceability**: If task implements known FR-* requirements, add `implements:` YAML frontmatter with FR-* codes from SRS. Optional — omit if FR-* not yet defined.
12. **Frontmatter Shape**: Required keys — `date: <YYYY-MM-DD>` (today's date as quoted ISO string), `status: to do` (initial value; auto-derived later), `tags: [...]` (may be empty `[]`), `related_tasks: [...]` (relative paths to other tasks under `documents/tasks/`, may be empty). Optional: `implements: [FR-...]`.
</rules>

## Question Format (FR-UNIVERSAL.QA-FORMAT)

For **clarifying / uncertainty-resolution questions** asked during research (Step 2):

- Each question MUST be a numbered list item (`1.`, `2.`, …) — not a heading, bold-only line, or paragraph.
- For multi-select questions, when the user delegates with `agent's choice` (or equivalent), pick the subset yourself, emit a one-line justification of the pick, and proceed without re-asking for confirmation.

**Phase approval (Step 4) and critique-points selection (Step 7) are exempt** — phase decomposition is a multi-section content presentation (the same prior that drives variant analysis), and critique triage is auto-classified by the agent without asking the user.

## Instructions

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan based on these steps.
   - Compute today's date in `YYYY-MM-DD` format (e.g. via `date +%Y-%m-%d`). Hold it as `<DATE>`. Derive `<YYYY>`, `<MM>`, `<DD>` (zero-padded). The eventual file path is `documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md`.

2. **Deep Context & Research**
   - If you don't know the content of `documents/requirements.md` (SRS) and `documents/design.md` (SDS) — read them now.
   - Follow `Proactive Resolution` from AGENTS.md: analyze prompt, codebase, search for gaps.
   - Use search tools (e.g., `glob`, `grep`, `ripgrep`, `search`, `webfetch`) for unknowns.
   - If uncertainties remain: ask user clarifying questions. STOP and wait.

3. **Draft Spec Header**
   - Create the parent directories `documents/tasks/<YYYY>/<MM>/<DD>/` (use `mkdir -p`).
   - Write to `documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md` the following sections:
     - YAML frontmatter with all required keys (rule 12): `date`, `status: to do`, `tags`, `related_tasks`, optional `implements`.
     - Title and metadata table (Status: Draft, Created/Updated dates)
     - Goal (business/user value — why are we building this?)
     - Overview (current state, why now, relevant context)
     - Non-Goals (explicit exclusions — critical for AI agents)
     - Architecture & Boundaries (three-tier: Always / Ask First / Never)
     - Definition of Done (measurable acceptance criteria)
   - **CRITICAL**: Do NOT fill Phases yet.

4. **Decompose into Phases (Chat Only)**
   - Present phase breakdown in chat:
     - Each phase: goal, scope (files/components), dependencies, estimated task count
     - Phases ordered by dependency (foundations first)
     - Target: ≤30-50 requirements per phase (within ~150-200 instruction limit)
   - Present to user. STOP and wait for approval/adjustments.

5. **Detail Phases**
   - Write approved phases into the epic file at `documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md`. Each phase contains:
     - Status (not-started / in-progress / done)
     - Prerequisites (which phases must be done first)
     - Goal (what this phase achieves)
     - Scope (files/components affected, target 1-5 files per task)
     - Tasks (numbered list of atomic, testable tasks)
     - Verification (specific commands/checks to confirm phase completion)
     - Notes (implementation hints, gotchas, references)

6. **Critique**
   - Present epic to user in chat and offer to critique it before finalizing.
   - If user agrees, critically analyze the epic for:
     - Missing phases or hidden dependencies
     - Tasks too large (should be split) or too small (should be merged)
     - Vague verification criteria
     - Missing non-goals or boundary gaps
     - Over-specification of trivial parts
   - Present critique in chat.

7. **Refine & Finalize**
   - Ask the user which critique points to address.
   - Update `documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md` with accepted improvements.
   - Update the metadata table Status from "Draft" to "Ready". (Frontmatter `status:` is auto-derived from DoD; do not change it manually.)

7a. **Write SRS-inline `**Tasks:**` Back-Pointer (FR-DOC-TASK-LINK)** — execute immediately, no permission needed. This is a write step.
   - For each FR-ID in the epic's `implements:` frontmatter, locate the heading `### <FR-ID>:` in `documents/requirements.md`.
   - If the heading does not exist (new FR introduced by the epic), SKIP this FR and emit a chat note: "FR-XXX SRS section pending — task back-pointer deferred."
   - If the heading exists, find the section's `**Description:**` bullet. Look at the line(s) immediately following it.
     - If a `- **Tasks:** [...]` bullet already exists: append `, [epic-<name>](tasks/<YYYY>/<MM>/<DD>/epic-<name>.md)` to the comma-separated list. Idempotent: skip if the exact link is already present.
     - If no `**Tasks:**` bullet exists yet: insert a new line `- **Tasks:** [epic-<name>](tasks/<YYYY>/<MM>/<DD>/epic-<name>.md)` immediately AFTER the `**Description:**` bullet.
   - **Surgical edit only**: rest of the SRS file MUST remain byte-identical.

8. **TOTAL STOP**

</step_by_step>

## Output Format

```markdown
---
date: YYYY-MM-DD
status: to do
implements:
  - FR-XXX
tags: []
related_tasks: []
---
# Epic: {Feature Name}

| Field   | Value                       |
|---------|-----------------------------|
| Status  | Draft/Ready/In-Progress/Done |
| Created | YYYY-MM-DD                  |
| Updated | YYYY-MM-DD                  |

## Goal

{Why are we building this? Business/user value.}

## Overview

{Current state, why now, relevant context.}

## Non-Goals

<!-- Examples: "No backward compatibility with v1 API", "No UI changes in this phase", "No performance optimization", "No migration of existing data" -->
- {Explicit exclusion 1}
- {Explicit exclusion 2}

## Architecture & Boundaries

### Always (agent autonomy)

- {Things agent can always do}

### Ask First

- {Things requiring user confirmation}

### Never

- {Things agent must never do}

## Definition of Done

- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}

---

## Phase 1: {Name}

**Status:** not-started | **Prerequisites:** none

### Goal

{What this phase achieves.}

### Scope

- {file/component 1}
- {file/component 2}

### Tasks

1. {Atomic, testable task}
2. {Atomic, testable task}

### Verification

- [ ] {Specific check or command}

### Notes

- {Implementation hints, gotchas}

---

## Phase 2: {Name}

...
```

## Verification

<verification>
- [ ] ONLY `documents/tasks/<YYYY>/<MM>/<DD>/epic-<name>.md` modified, plus optional surgical `**Tasks:**` line edits in `documents/requirements.md` (FR-DOC-TASK-LINK), plus optional `documents/index.md` row updates.
- [ ] Frontmatter contains `date`, `status: to do`, `tags`, `related_tasks` keys
- [ ] For every FR-ID in `implements:` whose SRS section already exists, the corresponding `### FR-XXX:` section now carries a `- **Tasks:**` bullet linking to the epic file. Other SRS lines unchanged.
- [ ] Each phase has: Goal, Prerequisites, Scope, Tasks, Verification
- [ ] Non-Goals section is non-empty
- [ ] Boundaries (Always/Ask First/Never) are specified
- [ ] No phase exceeds 50 requirements
- [ ] Tasks target ≤5 files each
- [ ] All phases have dependency ordering (no circular deps)
</verification>
