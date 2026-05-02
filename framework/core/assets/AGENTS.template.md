# Core Project Rules
- Follow your assigned role strictly — it defines scope and boundaries for your actions.
- After finishing a session, review all project documents(readme.md, requirements.md, design.md, etc) to ensure they reflect the current state. Stale docs mislead future sessions.
- Verify every change by running appropriate tests or scripts — never assume correctness without evidence.
- Keep the project in a clean state: no errors, warnings, or issues in formatter and linter output. A broken baseline blocks all future work.
- Follow the TDD flow described below. Skipping it leads to untested code and regressions.
- Write all documentation in English, compressed style. Brevity preserves context window.
- If you see contradictions in the request or context, raise them explicitly, ask clarifying questions, and stop. Do not guess which interpretation is correct.
- **Forward motion after authorization**: once the user has authorized a plan (chosen a variant, agreed to a phase list, or just said "go"), execute it without re-confirming each step. Re-asking is appropriate ONLY when (a) a genuinely irreversible action surfaces that was NOT covered by the original authorization — force push to a shared branch, prod deploy, dropping a database table, sending an external message (Slack, email, PR merge), or any other external side-effect that cannot be undone via git — OR (b) new information surfaces that contradicts the authorized plan (failing precondition, ambiguity discovered mid-flight). "Action looks expensive" or "diff is large" are NOT valid triggers — local code changes are reversible. Test before asking: if the user can only answer "yes" to the question, the question is noise — proceed instead.
- Code should follow "fail fast, fail clearly" — surface errors immediately with clear messages rather than silently propagating bad state. Unless the user requests otherwise.
- When editing CI/CD pipelines, always validate locally first — broken CI is visible to the whole team and slow to debug remotely.
- Provide evidence for your claims — link to code, docs, or tool output. Unsupported assertions erode trust.
- Use standard tools (jq, yq, jc) to process and manage structured output — they are portable and well-understood.
- Do not add fallbacks, default behaviors, or error recovery silently — if the user didn't ask for it, it's an assumption. If you believe a fallback is genuinely needed, ask the user first.
- Do not use tables in chat output — use two-level lists instead. Tables render poorly in terminal and are harder to scan.

---
{{PROJECT_RULES}}

## Project Information
- Project Name: {{PROJECT_NAME}}

## Project Vision
{{PROJECT_VISION}}

## Project tooling Stack
{{TOOLING_STACK}}

## Architecture
{{ARCHITECTURE}}

## Key Decisions
{{KEY_DECISIONS}}

## Documentation Hierarchy
1. **`AGENTS.md`**: Project vision, constraints, mandatory rules. READ-ONLY reference.
2. **SRS** (`documents/requirements.md`): "What" & "Why". Source of truth for requirements.
3. **SDS** (`documents/design.md`): "How". Architecture and implementation. Depends on SRS.
4. **Tasks** (`documents/tasks/<YYYY-MM-DD>-<slug>.md`): Temporary plans/notes per task. Gitignored — task files do not survive past the task lifecycle.
5. **ADR** (`documents/adr/<YYYY-MM-DD>-<slug>.md`): Architecture Decision Records (MADR-style). Persistent (NOT gitignored). Created by `flowai-skill-plan-adr` — a planning-class skill that writes both the rationale (Context / Alternatives / Decision / Consequences) and the implementation contract (Definition of Done with FR-Test-Evidence tuples + Solution) in one file. Lifecycle: `proposed | accepted | implemented | rejected | superseded | deprecated`. Status flips `accepted → implemented` on the commit that closes all DoD items.
6. **Index** (`documents/index.md`): Agent-maintained navigation aggregator across all linkable artifacts (FR / SDS / ADR / NFR). Created on first write, never scaffolded.
7. **`README.md`**: Public-facing overview. Installation, usage, quick start. Derived from AGENTS.md + SRS + SDS.

## Interconnectedness Principle

Cross-references between any two pieces of project knowledge — doc-to-doc, **and code-to-doc** — use **standard GFM markdown links**. One mechanism, no special syntaxes, works in every tool that understands markdown (renderers, IDEs, link checkers, agents).

- **Canonical form** — `[descriptive text](relative/path.md#auto-slug)`, where `auto-slug` is the GFM-normalized form of the target heading. Example: `[подробности](documents/design.md#модель-rag)` referencing the heading `## Модель RAG`.

- **Applies in code too** — when source code needs to reference documentation (an FR in SRS, a component in SDS, an ADR), the comment carries a GFM link, not a slug-style identifier. Example: `// implements [Command Execution](../documents/requirements.md#fr-cmd-exec-command-execution)`. The legacy `// FR-<ID>` shortcut is deprecated; new code uses GFM links.

- **Rejected forms** — do NOT invent ID-only link syntax like `[FR-CMD-EXEC]`, `[[wikilink]]`, custom anchor mechanisms (`{#my-anchor}`, `<a name=...>`), or bare ID strings as cross-reference markers (`// FR-CMD-EXEC`). Standard markdown renderers cannot resolve any of these consistently.

- **Heading IDs are conventions, not slugs** — section headings may carry mnemonic prefixes for readability (e.g., `### FR-CMD-EXEC: Command Execution`, `### ADR-0001: Use Deno`), but the link target is always the **GFM auto-slug** of the heading text, never a separate ID-derived identifier. If a heading is rewritten, links must be updated — this is the cost of standard tooling, not a bug.

- **Drift discipline** — removing or renaming a heading obliges updating every link to it. Checked mechanically by `scripts/check-traceability.ts` (link-resolution: file exists, anchor exists) where the project ships such a script, and semantically by `flowai-skill-maintenance` (Documentation health category).

## Documentation Map

Maps source code paths to documentation sections that describe them. Used by commit workflows to determine which doc sections need updating when files change.

{{DOCUMENTATION_MAP}}

If this section is empty or absent, commit workflows use a default mapping:
- New/changed exports, classes, types → SDS (component section)
- New feature, CLI command, skill, agent → SRS (new FR) + SDS (new component)
- Removed feature/component → remove from SRS + SDS
- Changed behavior → SDS (update description)
- Renamed/moved modules → SDS (update paths)
- README.md → only for user-facing changes

## Documentation Rules

Your memory resets between sessions. Documentation is the only link to past decisions and context. Keeping it accurate is not optional — stale docs actively mislead future sessions.

- Follow AGENTS.md, SRS, and SDS strictly — they define what the project is and how it works.
- Workflow for changes: new or updated requirement → update SRS → update SDS → implement. Skipping steps leads to docs-code drift.
- Status markers: `[x]` = implemented, `[ ]` = pending.
- **Traceability**: Every `[x]` criterion requires evidence. Placement depends on evidence type:
  1. **Code-evidenced**: Source files contain a GFM link (in a `//` or `#` comment) pointing to the relevant SRS/SDS heading near the implementing logic — e.g., `// implements [FR-CMD-EXEC](../documents/requirements.md#fr-cmd-exec-command-execution)`. The link IS the evidence; no paths are stored in SRS. The legacy `// FR-<ID>` shortcut is deprecated but still recognized during the migration period.
  2. **Non-code evidence** (benchmarks, URLs, config files without comment support, file/dir existence): Placed directly in SRS/SDS next to the criterion.
  Without evidence of either type, the criterion stays `[ ]`.
- **Acceptance-as-gate**: Every FR in SRS MUST declare a runnable `**Acceptance:**` reference — a test path + test name, a benchmark scenario ID, or a verification command. Prose-only acceptance is not sufficient. An FR stays `[ ]` until its acceptance reference exists and passes on the current commit. Exception: when automation cost exceeds defect cost (pure visual design, external vendor dependency), mark `**Acceptance: manual — <reviewer> — <checklist path>**`. Manual is the exception, not the default.

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
### 3.1 FR-CMD-EXEC
- **Desc:**
- **Scenario:**
- **Acceptance:** <test-path::test-name | benchmark-id | `evidence-command` | `manual — <reviewer>`>
- **Status:** [ ] / [x]
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

### Tasks (`documents/tasks/`)

- One file per task or session: `<YYYY-MM-DD>-<slug>.md` (kebab-case slug, max 40 chars).
- Examples: `2026-03-24-add-dark-mode.md`, `2026-03-24-fix-auth-bug.md`.
- Do not reuse another session's task file — create a new file. Old tasks provide context but may contain outdated decisions.
- Use GODS format (see below) for issues and plans.
- Directory is gitignored. Files accumulate — this is expected.

### ADR (`documents/adr/`)

- One file per non-trivial architectural decision: `<YYYY-MM-DD>-<slug>.md` (kebab-case slug, max 40 chars).
- Examples: `2026-03-24-pick-rag-over-finetune.md`, `2026-03-24-drop-postgres-for-sqlite.md`.
- Do not reuse another decision's ADR file — create a new file. Old ADRs are persistent rationale, not scratchpads.
- Use MADR format (see below) — both the rationale (Context / Alternatives / Decision / Consequences) and the implementation contract (Definition of Done + Solution) live in the same file.
- ID assignment: frontmatter `id: ADR-NNNN` is one greater than the highest existing `ADR-NNNN` under `documents/adr/`. Start at `ADR-0001`.
- Directory is **NOT gitignored** — ADRs are persistent records. Files accumulate by design — this is the point.
- Status lifecycle: `proposed | accepted | implemented | rejected | superseded | deprecated`. Default for new ADRs is `accepted`. Commit workflows flip `accepted → implemented` on the commit that closes all DoD items.

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

Every DoD item MUST pair with (a) an FR-ID and (b) a runnable acceptance reference. Items without this tuple are wishes, not contracts.

- [ ] FR-XXX: <observable behavior>
  - Test: `<path/to/test>::<test_name>` (or `Benchmark: <scenario-id>`)
  - Evidence: `<command that passes iff the item is done>`
- [ ] FR-YYY: <observable behavior>
  - Test: `...`
  - Evidence: `...`

## Solution

[Detailed step-by-step for SELECTED variant only. Filled AFTER user selects variant.]
```

### MADR Format

```markdown
---
id: ADR-NNNN
status: accepted
date: YYYY-MM-DD
implements:
  - FR-XXX
tags:
  - <optional>
---

# [Decision Title — short, imperative]

## Context

[2–4 sentences on the situation and constraints that forced this decision.]

## Alternatives

[Brief — 3–5 lines per entry, one Pros / Cons each. Mark the chosen one with `(CHOSEN)`. At least one rejected alternative with a single-sentence "Rejected because" line.]

- **<short name>** — 1-line description.
  - Pros: <bullet list>
  - Cons: <bullet list>
  - Rejected because: <one sentence> (omit for the chosen alternative; mark it `(CHOSEN)`)

## Decision

[1–2 sentences stating exactly what was decided. Cross-link affected components via GFM `[text](path.md#anchor)`.]

## Consequences

[Bullet list of follow-on effects, both positive and negative. Mention any SDS/SRS updates implied.]

## Definition of Done

Every DoD item MUST pair with (a) an FR-ID and (b) a runnable acceptance reference. Items without this tuple are wishes, not contracts.

- [ ] FR-XXX: <observable behavior>
  - Test: `<path/to/test>::<test_name>` (or `Benchmark: <scenario-id>`)
  - Evidence: `<command that passes iff the item is done>`

## Solution

[Detailed step-by-step for the CHOSEN alternative. Files to create/modify, implementation approach, dependencies, verification commands.]
```

### Compressed Style Rules (All Docs)

- No changelogs — docs reflect current state, not history.
- English only (except tasks, which may use the user's language).
- Summarize by extracting facts and compressing — no loss of information, just fewer words.
- Every word must carry meaning — no filler, no fluff, no stopwords where a shorter synonym works.
- Prefer compact formats: lists, tables, YAML, Mermaid diagrams.
- Abbreviate terms after first use — define once, abbreviate everywhere.
- Use symbols and numbers to replace words where unambiguous (e.g., `→` instead of "leads to").

## Requirements Lifecycle (Plan → Develop → Review → Commit)

Requirements are only real when a machine can verify them. Each phase of the cycle has a concrete, non-skippable binding between FR and acceptance test.

- **Plan** (`flowai-skill-plan` / `flowai-skill-epic`): a task plan is not accepted without (a) `implements:` frontmatter listing every FR it touches, (b) each DoD item paired with `(FR-ID, test-path-or-benchmark, evidence-command)`. If an FR is new, add its section to SRS with the `**Acceptance:**` field filled in the same pass.
- **Develop** (TDD): RED = write the acceptance test first, using the path declared in the plan, and confirm it fails. GREEN = minimal code + `// FR-<ID>` comment next to the implementing logic. CHECK = the project's `check` command passes, including the new test.
- **Review** (`flowai-skill-review` / `flowai-review-and-commit` / `flowai-skill-jit-review`): for every FR in scope, verify (a) SRS declares runnable acceptance, (b) the acceptance test exists and passes in the current diff, (c) source files carry `// FR-<ID>` markers. Any gap → `[critical]`, verdict cannot be `Approve`.
- **Commit** (`flowai-commit` / `flowai-review-and-commit`): before committing, if the diff adds/modifies FR sections in SRS, each new/modified FR MUST have a filled `**Acceptance:**` field. If it touches implementing code, the paired acceptance test MUST pass. Missing either → block commit.

Scope discipline prevents over-formalization: (1) pure bug fixes reuse an existing FR — add a regression test, no new FR; (2) refactors that preserve behavior cite the FR already covering the behavior; (3) only user-visible or contract-level changes introduce new FRs. The gate applies to new/changed FRs, not to every edit.

## Planning Rules

- **Environment Side-Effects**: When changes touch infra, databases, or external services, the plan must include migration, sync, or deploy steps — otherwise the change works locally but breaks in production.
- **Verification Steps**: Every plan must include specific verification commands (tests, validation tools, connectivity checks) — a plan without verification is just a wish.
- **Functionality Preservation**: Before editing any file for refactoring, run existing tests and confirm they pass — this is a prerequisite, not a suggestion. Without a green baseline you cannot detect regressions. Run tests again after all edits. Add new tests if coverage is missing.
- **Data-First**: When integrating with external APIs or processes, inspect the actual protocol and data formats before planning — assumptions about data shape are the #1 source of integration bugs.
- **Architectural Validation**: For complex logic changes, visualize the event sequence (sequence diagram or pseudocode) — it catches race conditions and missing edges that prose descriptions miss.
- **Variant Analysis**: When the path is non-obvious, propose variants with Pros/Cons/Risks per variant and trade-offs across them. Quality over quantity — one well-reasoned variant is fine if the path is clear.
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/tasks/<YYYY-MM-DD>-<slug>.md` using GODS format — chat-only plans are lost between sessions.
- **Proactive Resolution**: Before asking the user, exhaust available resources (codebase, docs, web) to find the answer autonomously — unnecessary questions slow the workflow and signal lack of initiative.

## TDD Flow

1. **RED**: Write a failing test for new or changed logic. When the change maps to an FR (new or modified), the failing test is the **FR's acceptance test** at the path declared in the plan's DoD; it doubles as the gate for `Requirements Lifecycle`. Pure internal refactors may use narrower unit tests.
2. **GREEN**: Write minimal code to pass the test. When implementing an FR, add a `// FR-<ID>` (TS/JS/Go/Rust) or `# FR-<ID>` (YAML/shell/Python) comment next to the implementing logic.
3. **REFACTOR**: Improve code and tests without changing behavior. Re-run the test.
4. **CHECK**: Run `fmt`, `lint`, and full test suite. You are NOT done after GREEN — skipping CHECK leaves formatting errors and regressions undetected. This step is mandatory.

### Test Rules

- Test logic and behavior only — do not test constants or templates, they change without breaking anything.
- Tests live in the same package. Testing private methods is acceptable when it improves coverage of complex internals.
- Write code only to fix failing tests or reported issues — no speculative implementations.
- No stubs or mocks for internal code. Use real implementations — stubs hide integration bugs.
- Run all tests before finishing, not just the ones you changed.
- When a test fails, fix the source code — not the test. Do not modify a failing test to make it pass, do not add error swallowing or skip logic.
- Do not create source files with guessed or fabricated data to satisfy imports — if the data source is missing, that is a blocker (see Diagnosing Failures).

## Diagnosing Failures

The goal is to identify the root cause, not to suppress the symptom. A quick workaround that hides the root cause is worse than an unresolved issue with a correct diagnosis.

1. Read the relevant code and error output before making any changes.
2. Apply "5 WHY" analysis to find the root cause.
3. Root cause is fixable → apply the fix, retry.
4. Second fix attempt failed → STOP. Output "STOP-ANALYSIS REPORT" (state, expected, 5-why chain, root cause, hypotheses). Wait for user help.

When the root cause is outside your control (missing API keys/URLs, missing generator scripts, unavailable external services, wrong environment configuration) → STOP immediately and ask the user for the correct values. Do not guess, do not invent replacements, do not create workarounds.

## Development Commands

### Shell Environment
- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (https://no-color.org/) — disable ANSI colors when it is set.

### Standard Interface
- `check` — the main command for comprehensive project verification. Runs the following steps in order:
  - build the project
  - comment-scan: "TODO", "FIXME", "HACK", "XXX", debugger calls, linter and formatter suppression markers
  - code formatting check
  - static code analysis
  - all project tests
- `test <path>` — runs a single test file or test suite.
- `dev` — runs the application in development mode with watch mode enabled.
- `prod` — runs the application in production mode.

### Detected Commands
{{DEVELOPMENT_COMMANDS}}

### Command Scripts
{{COMMAND_SCRIPTS}}

## Code Documentation

- **Module level**: each module gets an `AGENTS.md` describing its responsibility and key decisions.
- **Code level**: JSDoc/GoDoc for classes, methods, and functions. Focus on *why* and *how*, not *what*. Skip trivial comments — they add noise without value.
- **Requirement traceability**: when code implements a requirement from SRS (`documents/requirements.md`), add a `// FR-<ID>` (TS/JS/Go/Rust) or `# FR-<ID>` (YAML/shell/Python) comment next to the implementing logic. Code references requirements, not the reverse — SRS must not contain file paths. Exceptions: requirements verified by benchmarks or proven by file existence need no comment.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
