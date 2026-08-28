# Core Project Rules
- Follow your assigned role strictly — it defines scope and boundaries for your actions.
- **Prefer the right skill — match precisely, don't over-reach.** Before answering, check the installed skills (descriptions are available; you may list `.{ide}/skills/`). When a skill's stated purpose squarely fits the task, invoke it (via the Skill tool or by reading its `SKILL.md`) instead of improvising — skills encode the project's vetted workflow. Match on the skill's actual scope, not a shared keyword: if another installed skill fits better, or the request explicitly falls outside a skill's stated scope, defer to that skill or answer directly. When no skill clearly matches, proceed directly. **Knowing how to do the work yourself is not a reason to skip the skill** — it is the usual reason it gets skipped. When the request names an artifact a skill produces (a task file in the project's planning format, a review verdict, a release), invoking that skill IS the work; reproducing its workflow from memory drops the checks and conventions the skill carries and leaves nothing to say which of them ran. **Invoke it as your FIRST action** — before exploring the tree, before reading files, before announcing a plan of your own. Once you have started doing the work, you will not come back for the skill. And the fact that this file documents the artifact's format does not replace the skill: this file describes what the artifact looks like, the skill performs the work that produces it.
- After finishing a session, review all project documents(readme.md, requirements.md, design.md, etc) to ensure they reflect the current state. Stale docs mislead future sessions.
- Verify every change by running appropriate tests or scripts — never assume correctness without evidence.
- Keep the project in a clean state: no errors, warnings, or issues in formatter and linter output. A broken baseline blocks all future work.
- Follow the TDD flow described below. Skipping it leads to untested code and regressions. **The failing test is your first edit** — write it before you touch the implementation file, not after. Task size is not an exemption: the cycle is skipped precisely on the changes that look too small to need it, and once the implementation is written nobody goes back to write the test. **This is a precondition on the edit, not a step inside a workflow you may or may not enter.** Before you open an implementation file in order to change it, the failing test for that change already exists. A request that reads as one small familiar action is the case this precondition is for — it is answered by writing the test, not by recognising the action and performing it.
- Write all documentation in English. Keep it complete and readable — see the Readability Floor below.
- If you see contradictions in the request or context, raise them explicitly, ask clarifying questions, and stop. Do not guess which interpretation is correct. Do NOT resolve one unilaterally even when the resolution looks obvious — a reading that makes the conflicting requirements compatible is still your reading, not the author's intent. **Noticing the contradiction and proceeding anyway is not compliance.** Naming the conflict in your summary, or inventing a distinction the requirements never draw so that each one holds on its own branch, is the exact failure this rule exists to prevent. A reconciliation you had to construct is evidence of the contradiction, not a refutation of it. **The question is the deliverable** — coming back with the conflict and no code is a complete, correct answer to the request, not a failure to do the work. "Stopping would make the task impossible" is the signature of the situation this rule is for, not an exemption from it: if no single implementation satisfies every requirement at once, that IS the contradiction, and only the author can say which requirement gives way. The rule is not limited to which requirement wins: deciding what a requirement's TERM covers — what counts as a bypass, what counts as construction, which component owns a check — is the same question wearing a different hat, and reading more code never answers it. Nor is validity the test: a reconciliation can be architecturally sound, satisfy every requirement at once, and still be your reading rather than the author's. This is the one case the `Proactive Resolution` rule that follows does not cover — that rule is about facts you can look up, and neither which of two conflicting requirements was meant nor what its terms were meant to cover is in the codebase. The cost of asking is one round-trip; the cost of guessing wrong is reverting committed code.
- **Proactive Resolution**: Before asking the user, exhaust available resources (codebase, docs, web) to find the answer autonomously — unnecessary questions slow the workflow and signal lack of initiative. This covers questions with a findable answer. It does NOT cover a contradiction between two requirements, nor what a requirement's terms were meant to include: neither is recorded anywhere you can read, so searching harder only produces a more confident guess. That case goes to the contradiction rule above and stops there.
- **Forward motion after authorization**: once the user has authorized a plan (chosen a variant, agreed to a phase list, or just said "go"), execute it without re-confirming each step. Re-asking is appropriate ONLY when (a) a genuinely irreversible action surfaces that was NOT covered by the original authorization — force push to a shared branch, prod deploy, dropping a database table, sending an external message (Slack, email, PR merge), or any other external side-effect that cannot be undone via git — OR (b) new information surfaces that contradicts the authorized plan (failing precondition, ambiguity discovered mid-flight). "Action looks expensive" or "diff is large" are NOT valid triggers — local code changes are reversible. Test before asking: if the user can only answer "yes" to the question, the question is noise — proceed instead.
- Code should follow "fail fast, fail clearly" — surface errors immediately with clear messages rather than silently propagating bad state. Unless the user requests otherwise.
- When editing CI/CD pipelines, always validate locally first — broken CI is visible to the whole team and slow to debug remotely.
- Provide evidence for your claims — link to code, docs, or tool output. Unsupported assertions erode trust.
- Use standard tools (jq, yq, jc) to process and manage structured output — they are portable and well-understood.
- Do not add fallbacks, default behaviors, or error recovery silently — if the user didn't ask for it, it's an assumption. If you believe a fallback is genuinely needed, ask the user first.
- **A missing input is a blocker, not a gap to fill.** When the code needs something that is not there — a module an import names, a generator script, an API key, a fixture, a dataset — stop and ask for it. **The user's own sentence is a trigger too, not just the code's need**: when they say they do not remember, do not know, or do not have a value — an address, a key, a path, a setting — this rule binds at that sentence, however ordinary the request around it looked. Making the value configurable is not a way of not needing it: you would still be choosing the fallback, and the one that works is still the one only they have. **This binds the moment you notice the thing is missing, which is before you decide how to proceed.** Once you have a solution in mind you will read this rule looking for an exemption rather than for guidance, and you will find one; the rule is worth nothing if you reach it after the decision. **Stopping is a complete answer to "fix it".** Naming what is absent, and naming what you would have had to invent to continue, is the finished work here rather than a failure to do the work — the instruction told you what to repair, and it cannot authorize a source for data it never mentions. Supplying it yourself is a decision above the class/method line under `Decision-level engagement`: you would be choosing where the project's data comes from, and that is a new dependency and a data shape at once. It is also a guess at why the thing is absent — never committed, lost, or removed on purpose — and those three call for three different actions, none of them yours to pick. **The prohibition is on the decision, not on any one way of carrying it out.** Writing the values from memory, deriving them from a neighbouring module, and writing the missing generator yourself and running it against a live API are one act with different tooling: each ends with an artefact the project did not have, in a shape you chose, from a source you chose. **Provenance is the test, not accuracy.** Values you looked up and believe are correct still arrive with no source recorded and no way to regenerate them, and giving the file a header that says it was generated makes that worse rather than better. A comment saying the artefact is generated, or must not be written by hand, is a decision already made rather than an obstacle to route around. **The deliverable carve-out is narrow: an artefact is your deliverable only when the user named that artefact.** "Fix the failing test", "make it work", "add the feature" name a goal, and a goal does not name a file — if you had to derive that the artefact was wanted, it is a missing input and this rule holds.
- Do not use tables in chat output — use two-level lists instead. Tables render poorly in terminal and are harder to scan.
- **Decision-level engagement — the human owns decisions, the AI owns code.** The boundary is the level of individual classes/methods: the human initiates and approves every decision *above* it (business rules, architecture, public interfaces / data shapes, new dependencies, key technical trade-offs); the AI decides freely at or below it (local naming, private helpers, test layout).
- **Surface above-class/method decisions before implementing.** When a decision above the class/method line is NOT already settled by an approved plan, present it to the human as options + trade-offs + a recommendation and STOP — wait for the human's call; do NOT self-select a default and proceed.
- **Narrate upward, not in diffs.** Report work in terms of requirements AND the class/method structure you produced (names, responsibilities, relationships), in prose the human can accept WITHOUT reading the code. Every above-class/method decision you made or surfaced MUST appear in that summary — an omitted one is a defect (this keeps mental/cognitive debt at zero above the class/method line). Never make reading the diff the only way to understand what changed.
- **AI owns code review; diff review is optional (Model B).** The AI reviews the code itself and reports a decision-level verdict (task complete? design sound? key risks?); the human is NOT required to read the diff to accept it. Offer the diff for optional inspection — never block the workflow on the human reading code.

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
4. **Tasks** (`documents/tasks/<YYYY>/<MM>/<slug>.md`): Persistent committed plans/notes per task.
5. **Index** (`documents/index.md`): Agent-maintained navigation aggregator across all linkable artifacts (FR / SDS / NFR). Created on first write, never scaffolded. Task ↔ FR navigation lives inline in SRS as `**Tasks:**` back-pointers, not here.
7. **`README.md`**: Public-facing overview. Installation, usage, quick start. Derived from AGENTS.md + SRS + SDS.

## Interconnectedness Principle — SALP

Cross-references between any two pieces of project knowledge — doc-to-doc, **and code-to-doc** — use the **SALP grammar** (Semantic Anchor / Link Protocol). One mechanism, two tokens, namespace-disambiguated, machine-validated.

- **Anchor** — `[ANC:<ns>:<id>]` — declares a named target. Place it on the same line as the heading it labels, after the title text. Example: `### FR-CMD-EXEC: Command Execution [ANC:fr:cmd-exec]`.

- **Reference** — `[REF:<ns>:<id>]` or `[REF:<ns>:<id> | <display>]` — points at a target. The optional `| display` text is what readers see. Example: `See [REF:fr:cmd-exec | FR-CMD-EXEC] for details.`

- **Namespace grammar (open set)** — `<ns>` matches `[a-z][a-z0-9-]*`. The set is open: any grammar-conformant value is accepted by the validator. Examples currently in use: `fr` (functional requirements), `sds` (design sections), `task` (committed tasks), `nfr` (non-functional requirements), `code` (source-code references), `mx-concept` / `mx-person` / `mx-source` / `mx-answer` (memex pages). New consumers may introduce new namespaces without changing the validator.

- **ID grammar** — `<id>` is lower-kebab (`[a-z0-9][a-z0-9.-]*`). Hierarchical FR IDs preserve the period (`FR-DIST.MARKETPLACE` → `dist.marketplace`).

- **Applies in code too** — when source code needs to reference documentation, the comment carries a SALP REF, not a slug-style identifier or a GFM link. Example: `// [REF:fr:cmd-exec] — execution gate`. The legacy `// FR-<ID>` shortcut and the previous GFM-link form (`// [FR-X](path.md#…)`) are rejected by the validator.

- **Rejected forms** — do NOT use ID-only shortcuts (`[FR-CMD-EXEC]`), wikilinks (`[[X]]`), bare ID strings (`// FR-CMD-EXEC`), custom anchor mechanisms (`{#my-anchor}`, `<a name=...>`), GFM-form cross-references (`[FR-X](path.md#…)`), or salp-short (`[ANC:id]` without namespace). Validators ship with the framework reject all of these.

- **Drift discipline** — removing or renaming an anchor obliges updating every reference to it. Checked mechanically by `scripts/check-salp.ts` (dead-REF / duplicate-ANC / surviving-legacy-grammar) where the project ships such a script.

### Migrating from GFM

If your project was initialised before flowai adopted SALP, run the shipped one-shot migration script ONCE after `flowai sync` pulls the new template:

```sh
deno run -A .claude/scripts/migrate-to-salp.ts --write
```

The script converts GFM-form FR links (`[FR-X](path.md#…)`), wikilinks (`[[X]]`), and bare `// FR-X` comments into SALP form in-place. It is idempotent (safe to re-run) and fails fast on any unresolvable target (no silent skips). A first-class `flowai migrate-anchors` CLI verb is planned for a future release; until then, invoke the script directly.

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
  1. **Code-evidenced**: Source files contain a SALP REF (in a `//` or `#` comment) pointing at the relevant SRS / SDS anchor near the implementing logic — e.g., `// [REF:fr:cmd-exec] — execution gate`. The REF IS the evidence; no paths are stored in SRS. Bare `// FR-<ID>` and GFM-form `// [FR-X](path.md#…)` comments are rejected by the SALP validator.
  2. **Non-code evidence** (acceptance tests, URLs, config files without comment support, file/dir existence): Placed directly in SRS/SDS next to the criterion.
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

- One file per task or session at a date-hierarchy path: `documents/tasks/<YYYY>/<MM>/<slug>.md` (kebab-case slug, max 40 chars).
- Examples: `documents/tasks/2026/03/add-dark-mode.md`, `documents/tasks/2026/03/fix-auth-bug.md`.
- Do not reuse another session's task file — create a new file. Old tasks are persistent canonical records.
- Use GODS format — this is the project's **accepted task format**, and everything outside this file refers to it by that name rather than by "GODS". This file does NOT carry the format itself: the `write-gods-tasks` skill is its single source, and writing a task file starts by loading that skill. Architectural decisions are recorded as regular tasks with weighed alternatives in the body — there is no separate ADR primitive.
- Frontmatter: `date` (YYYY-MM-DD; required), `status: to do | in progress | done | superseded` (required), `implements: [FR-...]` (optional — present for FR-driven tasks, omitted for internal/maintenance), optional `tags`, optional `related_tasks` (markdown links to other task files), optional `migrated_from` for provenance, optional `superseded_by` (required when `status: superseded`).
- Status auto-derives from `## Definition of Done` checkbox count on every commit for non-superseded tasks (commit workflows handle this — never edit `status` manually mid-flight). `status: superseded` preserves provenance and is excluded from DoD derivation.
- Directory is **NOT gitignored** — tasks are persistent records. Validated by `scripts/check-task-format.ts` (path regex, status enum, status↔DoD consistency).

### Readability Floor (All Docs)

- No changelogs — docs reflect current state, not history.
- English only (except tasks, which may use the user's language).
- Prefer compact formats: lists, tables, YAML, Mermaid diagrams.

## Chat Output Style

Chat replies only — not documents, code, or commit messages. The compact register of
project documents must not carry over into chat.

Follow plain language (ISO 24495-1) and the W3C COGA note "Making Content Usable"
(https://www.w3.org/TR/coga-usable/). Use structure — lists, tables, Mermaid diagrams —
wherever it carries meaning better than prose does.

- Keep sentences under 25 words. Split a sentence that carries two different ideas.
- Conclusion first: the result opens the paragraph, the reasoning follows.
- A failure report states what happened and what to do next.
- Name the concrete edit or command for each problem, not just what the tool wants.

## Requirements Lifecycle (Plan → Develop → Review → Commit)

Requirements are only real when a machine can verify them. Each phase of the cycle has a concrete, non-skippable binding between FR and acceptance test.

- **Plan** (`plan` / `epic`): a task plan is not accepted without (a) `implements:` frontmatter listing every FR it touches, (b) each DoD item paired with `(FR-ID, test-path-or-benchmark, evidence-command)`. If an FR is new, add its section to SRS with the `**Acceptance:**` field filled in the same pass.
- **Develop** (TDD): RED = write the acceptance test first, using the path declared in the plan, and confirm it fails. GREEN = minimal code + a SALP REF comment (`// [REF:fr:<id>]`) next to the implementing logic. CHECK = the project's `check` command passes, including the new test.
- **Review** (`review` / `review-and-commit`): for every FR in scope, verify (a) SRS declares runnable acceptance, (b) the acceptance test exists and passes in the current diff, (c) source files carry SALP REF comments (`// [REF:fr:<id>]`) next to the implementing logic. Any gap → `[critical]`, verdict cannot be `Approve`. Review also runs a JiT subset that probes for hidden behavioural regressions via ephemeral pass-on-parent / fail-on-diff tests; surviving catching tests are `[critical]` findings.
- **Commit** (`commit` / `review-and-commit`): before committing, if the diff adds/modifies FR sections in SRS, each new/modified FR MUST have a filled `**Acceptance:**` field. If it touches implementing code, the paired acceptance test MUST pass. Missing either → block commit.

Scope discipline prevents over-formalization: (1) pure bug fixes reuse an existing FR — add a regression test, no new FR; (2) refactors that preserve behavior cite the FR already covering the behavior; (3) only user-visible or contract-level changes introduce new FRs. The gate applies to new/changed FRs, not to every edit.

## Planning Rules

- **Environment Side-Effects**: When changes touch infra, databases, or external services, the plan must include migration, sync, or deploy steps — otherwise the change works locally but breaks in production.
- **Verification Steps**: Every plan must include specific verification commands (tests, validation tools, connectivity checks) — a plan without verification is just a wish.
- **Functionality Preservation**: Before editing any file for refactoring, run existing tests and confirm they pass — this is a prerequisite, not a suggestion. Without a green baseline you cannot detect regressions. Run tests again after all edits. Add new tests if coverage is missing. **This rule binds on the request, not on the plan**: a refactor asked for directly, with no planning phase in front of it, still starts by running the tests. Reading the test file is not running it, and a single run at the end proves the code works — it cannot prove you did not break something that was already broken. **This step comes before the TDD cycle, including before the RED test**: writing a new test file is itself starting work, so the baseline is taken before it, and running the test you have just written is not the baseline — the existing suite is.
- **Data-First**: When integrating with external APIs or processes, inspect the actual protocol and data formats before planning — assumptions about data shape are the #1 source of integration bugs.
- **Architectural Validation**: For complex logic changes, visualize the event sequence (sequence diagram or pseudocode) — it catches race conditions and missing edges that prose descriptions miss.
- **Variant Analysis**: A format for comparing alternatives of any kind — approaches, designs, tools, libraries, vendors, data models, configurations. Present each candidate as a labeled option with Pros / Cons / Risks / Best-for, then analyze the trade-offs across options (e.g. speed vs. correctness, cost vs. flexibility). One option is acceptable when the path is clear; when it is non-obvious, surface multiple distinct options.
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/tasks/<YYYY>/<MM>/<slug>.md` in the accepted task format, whose template the `write-gods-tasks` skill defines — chat-only plans are lost between sessions.

## TDD Flow

1. **RED**: Write a failing test for new or changed logic, and run it to watch it fail, before the production file is edited. When the change maps to an FR (new or modified), the failing test is the **FR's acceptance test** at the path declared in the plan's DoD; it doubles as the gate for `Requirements Lifecycle`. Pure internal refactors may use narrower unit tests. Having no FR and no plan changes WHICH test you write, never whether you write one: the acceptance-test path is conditional, the failing test is not. A request phrased as "add function X to file Y" is still new logic and still starts here — the phrasing names the destination, it does not waive the cycle.
2. **GREEN**: Write minimal code to pass the test. When implementing an FR, add a SALP REF comment — `// [REF:fr:<id>]` (TS/JS/Go/Rust) or `# [REF:fr:<id>]` (YAML/shell/Python) — next to the implementing logic.
3. **REFACTOR**: Improve code and tests without changing behavior. Re-run the test.
4. **CHECK**: Run `fmt`, `lint`, and the full test suite. **This is a precondition on finishing, not a step inside a workflow you may or may not enter**: before you write the summary that ends your turn, CHECK has passed. You are done only after it does, and skipping it leaves formatting errors and regressions undetected. The suite is the whole project's, never the file you touched — a change that cannot possibly affect another module is exactly the belief CHECK exists to test. When the project records no single check command, that is not an exemption: run its formatter, its linter and its full test suite separately.

### Test Rules

- Test logic and behavior only — do not test constants or templates, they change without breaking anything.
- Tests live in the same package. Testing private methods is acceptable when it improves coverage of complex internals.
- Write code only to fix failing tests or reported issues — no speculative implementations.
- No stubs or mocks for internal code. Use real implementations — stubs hide integration bugs.
- Run all tests before finishing, not just the ones you changed.
- When a test fails, fix the source code — not the test. Do not modify a failing test to make it pass, do not add error swallowing or skip logic.
- Do not create a source file to satisfy an import when the data source it depends on is missing — that is a blocker (see Diagnosing Failures and the missing-input rule in Core Project Rules). Accuracy is not a way around this: data you looked up rather than invented still lands with no source recorded and no way to regenerate it.

## Diagnosing Failures

The goal is to identify the root cause, not to suppress the symptom. A quick workaround that hides the root cause is worse than an unresolved issue with a correct diagnosis.

1. Read the relevant code and error output before making any changes.
2. Apply "5 WHY" analysis to find the root cause.
3. Root cause is fixable → apply the fix, then re-run. **The re-run is the whole suite, not the test you were repairing** — this is a precondition on calling the repair done, not a step inside the TDD cycle: a test that was already red when you arrived is not a cycle you entered, so the CHECK step above never binds here. Narrowing the final command to the file you touched is the failure this exists to prevent, and it is the one that happens: the fix is local, so the check is made local too, and nothing you did not think about gets run.
4. Second fix attempt failed → STOP. Output "STOP-ANALYSIS REPORT" (state, expected, 5-why chain, root cause, hypotheses). Wait for user help.

When the root cause is outside your control (missing API keys/URLs, missing generator scripts, unavailable external services, wrong environment configuration) → this is the blocker rule at the top of this file, not a narrower case of it: STOP immediately and ask the user. Do not guess, do not invent replacements, do not create workarounds. A default value is an invented replacement, and so is a configurable alternative: if you would have to choose the fallback, you are guessing, and restructuring so the input is not needed yet is a workaround rather than a fix. **The test is authorization, not access** — being able to produce the missing thing yourself is not permission to add it. `Proactive Resolution` does not reach here; there is no fact to look up.

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
- **Requirement traceability**: when code implements a requirement from SRS (`documents/requirements.md`), add a SALP REF comment — `// [REF:fr:<id>]` (TS/JS/Go/Rust) or `# [REF:fr:<id>]` (YAML/shell/Python) — next to the implementing logic. The bare `// FR-<ID>` form is retired and the SALP validator rejects it. Code references requirements, not the reverse — SRS must not contain file paths. Exceptions: requirements verified by acceptance tests or proven by file existence need no comment.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
