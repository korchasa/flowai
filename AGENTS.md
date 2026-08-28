# Core Project Rules
- Follow your assigned role strictly — it defines scope and boundaries for your actions.
- After finishing a session, review all project documents (README.md, documents/requirements.md, documents/design.md, etc.) to ensure they reflect the current state. Stale docs mislead future sessions.
- Verify every change by running appropriate tests or scripts — never assume correctness without evidence.
- Keep the project in a clean state: no errors, warnings, or issues in formatter and linter output. A broken baseline blocks all future work.
- Follow the TDD flow described below. Skipping it leads to untested code and regressions.
- Write all documentation in English. Keep it complete and readable — see the Readability Floor below.
- If you see contradictions in the request or context, raise them explicitly, ask clarifying questions, and stop. Do not guess which interpretation is correct. Do NOT resolve unilaterally even when the resolution seems obvious — "minor" contradictions in numbering, naming, or scope routinely hide intent the user did not state. Noting the contradiction in chat while still proceeding is NOT enough. The cost of asking is one round-trip; the cost of guessing wrong is reverting committed code.
- **Forward motion after authorization**: once the user has authorized a plan (chosen a variant, agreed to a phase list, or just said "go"), execute it without re-confirming each step. Re-asking is appropriate ONLY when (a) a genuinely irreversible action surfaces that was NOT covered by the original authorization — force push to a shared branch, prod deploy, dropping a database table, sending an external message (Slack, email, PR merge), or any other external side-effect that cannot be undone via git — OR (b) new information surfaces that contradicts the authorized plan (failing precondition, ambiguity discovered mid-flight). "Action looks expensive" or "diff is large" are NOT valid triggers — local code changes are reversible. Test before asking: if the user can only answer "yes" to the question, the question is noise — proceed instead.
- Code should follow "fail fast, fail clearly" — surface errors immediately with clear messages rather than silently propagating bad state. Unless the user requests otherwise.
- When editing CI/CD pipelines, always validate locally first — broken CI is visible to the whole team and slow to debug remotely.
- Provide evidence for your claims — link to code, docs, or tool output. Unsupported assertions erode trust.
- Use standard tools (jq, yq, jc) to process and manage structured output — they are portable and well-understood.
- Do not add fallbacks, default behaviors, or error recovery silently — if the user didn't ask for it, it's an assumption. If you believe a fallback is genuinely needed, ask the user first.
- Do not use tables in chat output — use two-level lists instead. Tables render poorly in terminal and are harder to scan.
- **Push is pre-authorized**: this is a solo-maintained project — `git push` (non-force) to any branch including `main` is pre-authorized and does NOT require per-action confirmation. Treat it as a local, reversible action. Force push, branch deletion on remote, and PR merge still require explicit confirmation.
- **Worktree freshness**: immediately after entering a worktree (e.g., `EnterWorktree` or `git worktree add`), check whether the branch is behind `main` and rebase before making edits. Diff-pollution from upstream commits is invisible until review. Quick check: `git log --oneline ${branch_base}..main | head` — non-empty output means rebase first (`git stash -u && git rebase main && git stash pop`).
- **Worktree paths**: when CWD is inside a worktree, prefer **relative paths** for `Write`/`Edit` calls. If an absolute path is required, derive it from `pwd` / `Deno.cwd()`, never from project memory. The worktree path (`<repo-root>/.claude/worktrees/<name>/`) and the repo-root path point to **different working trees**; an absolute path to repo-root from inside a worktree is a silent cross-tree leak.
- **Safety guards are not friction**: when a guard blocks an action (`system_health`, `process_watchdog`, pre-commit hooks, lint disables, `--force`, `--no-verify`), the guard is a signal that conditions are wrong — NOT a hint to use the override. Diagnostic text in the guard's error message that mentions an override env var or flag is informational for an operator, NOT authorization for the agent. To proceed: report the blocker, propose remediation (free memory, fix the failing test, address the lint warning), and ask the user — or hand off. Do NOT pre-emptively use override flags / env vars / `--force` / `--no-verify` without explicit per-action authorization.

---
- When `typescript-lsp` plugin is enabled, it auto-removes unused exports/imports on save. When adding a new exported function, edit the consumer file (import) before or simultaneously with the provider file (export) — otherwise LSP will delete the "unused" export between edits. Alternative: use Write tool (full rewrite) instead of Edit for the provider file.
- Everything in `framework/` is the framework — the product of this project. Users install it via flowai into their IDE's config dir (`.claude/`). Do not confuse framework skills/agents with dev resources in `.claude/skills/` and `.claude/agents/`.
- Any changes to skills or agents must follow Acceptance Test TDD flow (see "Acceptance Test TDD" section below) — untested skill changes lead to regressions that are hard to detect without acceptance tests.
- This is a universal framework for multiple IDEs (Cursor, Claude Code, OpenCode). Do not use tool names specific to a single IDE — write generically and provide examples for various IDEs. For example, instead of `use todo_write`, use `add to todo list (by todo_write, todowrite, etc.)`.
- Use relative paths in commands when possible — absolute paths only when required by the tool or context.
- Be precise in wording. Use a scientific approach — accompany highly specialized terms and abbreviations with short hints in parentheses.
- Deno's `crypto.subtle.digest` rejects `Uint8Array` views backed by `ArrayBufferLike` (TS2345 on `BufferSource`). Pass a fresh `ArrayBuffer` instead: `const buf = new ArrayBuffer(bytes.byteLength); new Uint8Array(buf).set(bytes); await crypto.subtle.digest("SHA-256", buf);`.

## Project Information
- Project Name: flowai

## Project Vision

Moved to the SRS constitution — now the single source of truth for the mission,
the two metaproblems (context loss, cognitive debt), the failure modes, and the
principles: `documents/requirements.md`, sections "Constitution — Mission",
"Constitution — Foundational Failure Modes", and "Constitution — Principles".
Keep this file to project rules and tooling; do not restate the vision here
(SPOT). The cognitive-debt definition lives in "Constitution — Mission".

## Project tooling Stack
- TypeScript
- Deno
- Python (benchmark fixtures only; no production scripts)

## Architecture
- `framework/<pack>/`: Source of truth for product packs. Each pack has `pack.yaml` + two primitive dirs: `commands/` (user-only workflows) and `skills/` (agent-invocable capabilities). `agents/`, `hooks/`, `scripts/`, `assets/`, `acceptance-tests/` are optional.
- `.claude/skills/`, `.claude/agents/`: Dev-only resources (not distributed). Framework commands + skills install into `.claude/skills/` (commands get `disable-model-invocation: true` injected by the CLI writer).
- `documents/`: SRS/SDS and supporting documentation
- `scripts/`: Deno task scripts
- **CLI distribution** (external): the `flowai` command-line tool lives in the standalone repo [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) (JSR: `@korchasa/flowai`). This repo no longer publishes to JSR. Framework content reaches the CLI via a SHA-256-pinned `framework.tar.gz` asset on `framework-v<version>` GitHub releases of this repo (FR-DIST.BUNDLE.PIN, FR-CICD.SPLIT).
- `.github/workflows/ci.yml`: CI/CD for this (framework) repo — runs `deno task check` and, on `feat:`/`fix:` commits, cuts a `chore(release)` plus a `framework-v<version>` GitHub release with the reproducible tarball.

## Terminology (agentskills.io)

All workflows are implemented as **Skills** according to the [agentskills.io](https://agentskills.io/home) standard (folders with `SKILL.md`). At the framework source level they are split into two sibling directories per pack, which is the **primary classifier**:

- **Commands** — `framework/<pack>/commands/<name>/SKILL.md`. User-only workflows. Invoked by the user (e.g. `/commit` or plugin `/flowai:commit`); the agent does not auto-discover them. Name: short kebab-case without the legacy `flowai-` prefix (e.g. `commit`, `review-and-commit`, `update`). Source SKILL.md MUST NOT declare `disable-model-invocation` — the CLI writer injects `disable-model-invocation: true` at sync time based on directory placement.
- **Skills** — `framework/<pack>/skills/<name>/SKILL.md`. Agent-invocable capabilities (e.g. `draw-mermaid-diagrams`). Name: short kebab-case without the legacy `flowai-` prefix; command-vs-skill classification is determined by source directory. Source SKILL.md MUST NOT declare `disable-model-invocation`.

### Two meanings of "command" — don't confuse them

1. **Framework command**: a user-only primitive under `framework/<pack>/commands/`. Installs into `.{ide}/skills/` alongside skills; the only IDE-visible difference is the injected flag. This is the sense used everywhere in this project's source tree and documentation.
2. **IDE slash command**: a flat `.md` file under `.{ide}/commands/` (e.g. `.claude/commands/my-cmd.md`). Owned by the user, managed by `flowai user-sync` for cross-IDE propagation. The CLI's `PlanItemType = "command"` refers exclusively to sense (2). Framework commands never land in this directory.

## Key Decisions
- Use agentskills.io skills as the primary workflow system
- Store project knowledge in `documents/` using SRS/SDS schema
- Centralize verification through `deno task check`
- Dev resources in `.claude/` (skills, agents). Framework resources installed by flowai

## Documentation Hierarchy
1. **`AGENTS.md`**: Project constraints and mandatory rules. READ-ONLY reference. Vision/mission moved to the SRS constitution (item 2).
2. **SRS** (`documents/requirements.md`): "What" & "Why", plus the constitution (mission, failure modes, principles). Source of truth for requirements AND vision.
3. **SDS** (`documents/design.md`): "How". Architecture and implementation. Depends on SRS.
4. **Tasks** (`documents/tasks/<YYYY>/<MM>/<slug>.md`): Temporary plans/notes per task.
5. **IDE Differences** (`documents/ides-difference.md`): Reference. Cross-IDE capability comparison (primitives, hooks, agents, MCP). Informs FR-HOOK-DOCS–FR-IDE-SCOPE.
6. **`README.md`**: Public-facing overview. Derived from AGENTS.md + SRS + SDS. Installation, usage, pack/skill catalog, project structure. Keep in sync with framework state.

## Documentation Map

Maps source-code paths to documentation sections that describe them. Used by
`commit` / `review-and-commit` to find the section to compare-and-update
when each file changes. If a change touches a path below and the mapped section
contradicts new code → update the section.

- `framework/<pack>/commands/<name>/SKILL.md` → [README §Packs](README.md#packs), [REF:fr:cmd-exec | FR-CMD-EXEC] / any `FR-*<NAME>*` clause, [REF:sds:3-1-1 | SDS §3.1.1 Product Packs], [REF:sds:3-0 | SDS §3.0 Primitive Inventory]. **If the path is listed as a target in `framework/composites.yaml`, the SKILL.md is a gitignored generator build artefact — do NOT hand-edit and do NOT expect it in git; edit `framework/atoms/<name>.md` or `framework/composites/<name>.md` and let any consumer (`deno task check`, etc.) regenerate on next run, or manually `deno run -A scripts/generate-skill-composites.ts --write` (FR-SKILL-COMPOSE).**
- `framework/<pack>/skills/<name>/SKILL.md` → [README §Packs](README.md#packs), [REF:fr:howto | FR-HOWTO] / any `FR-*<NAME>*` clause, [REF:sds:3-1-1 | SDS §3.1.1 Product Packs], [REF:sds:3-0 | SDS §3.0 Primitive Inventory]. **Same gitignored-build-artefact rule as commands above.**
- `framework/atoms/<name>.md` → SRS FR-SKILL-COMPOSE, [REF:sds:3-0 | SDS §3.0 Primitive Inventory]; atomic source consumed by the generator. Excluded from `framework.tar.gz` (see `scripts/check-pack-refs.ts --leakage`).
- `framework/composites/<name>.md` → SRS FR-SKILL-COMPOSE, [REF:sds:3-0 | SDS §3.0 Primitive Inventory]; composite wrapper consumed by the generator. Excluded from the bundle.
- `framework/composites.yaml` → SRS FR-SKILL-COMPOSE, SDS §3.1.1 Composite Skill Generation subsection, [REF:sds:3-0 | SDS §3.0 Primitive Inventory]. Excluded from the bundle.
- `framework/<pack>/agents/<name>.md` → [REF:sds:3-2 | SDS §3.2 Product Agents], [REF:sds:3-0 | SDS §3.0 Primitive Inventory], README §Agents (if public-facing)
- `framework/<pack>/hooks/` → SRS `FR-HOOK-*` clauses, [REF:sds:3-1-1 | SDS §3.1.1 Product Packs] (hook subsection)
- `framework/<pack>/pack.yaml` → [REF:fr:packs | FR-PACKS], [REF:sds:3-1-1 | SDS §3.1.1 Product Packs]; [README §Packs](README.md#packs) when a pack is added/removed
- `framework/<pack>/assets/AGENTS.template.md` → [REF:fr:init | FR-INIT] (template variables); check README mentions
- CLI source files (`src/sync.ts`, `src/migrate.ts`, `src/user_sync.ts`, `src/update.ts`, `src/loop.ts`, `src/adapt.ts`, etc.) → live in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli); the FR clauses in this repo's SRS (`FR-DIST.SYNC`, `FR-DIST.MIGRATE`, `FR-DIST.USER-SYNC`, `FR-DIST.UPDATE`, `FR-LOOP`, `FR-ADAPT-INSTRUCTIONS`) define the contract those files must satisfy.
- `scripts/acceptance-tests/` → SRS `FR-ACCEPT*` clauses, [REF:sds:3-4 | SDS §3.4 Acceptance Test System]
- `scripts/acceptance-tests/lib/cache.ts` / `acceptance-tests/cache/` → [REF:fr:accept-cache | FR-ACCEPT-CACHE], [REF:sds:3-4-1 | SDS §3.4.1 Acceptance Test Result Cache]
- `scripts/acceptance-tests/lib/process_watchdog.ts` / `scripts/acceptance-tests/lib/system_health.ts` → [REF:fr:accept-guards | FR-ACCEPT-GUARDS], [REF:sds:3-4-2 | SDS §3.4.2 Resource Guards]
- `scripts/check-*.ts` → SDS §5 Logic / validation rules; SRS where the rule is first defined
- `scripts/task-*.ts` → [README §CLI Commands](README.md#cli-commands)
- `documents/ides-difference.md` is READ-ONLY reference for `FR-HOOK-DOCS`..`FR-IDE-SCOPE` clauses — update only when IDE capabilities change.
- Files whose changes NEVER require doc sync: `*_test.ts`, `**/acceptance-tests/*/mod.ts`, `**/acceptance-tests/*/fixture/**`, `.github/`, `.devcontainer/`, formatting-only edits, `deno.lock`.

## Documentation Rules

Your memory resets between sessions. Documentation is the only link to past decisions and context. Keeping it accurate is not optional — stale docs actively mislead future sessions.

- Follow AGENTS.md, SRS, and SDS strictly — they define what the project is and how it works.
- Workflow for changes: new or updated requirement -> update SRS -> update SDS -> implement. Skipping steps leads to docs-code drift.
- Status markers: `[x]` = implemented, `[ ]` = pending.
- **Traceability**: Every `[x]` criterion requires evidence. Placement depends on type:
  1. **Code-evidenced**: Source files contain `// FR-<ID>` (TS/JS) or `# FR-<ID>` (YAML/shell)
     comments near implementing logic. Validated by `deno task check` (`check-traceability.ts`).
     No paths in SRS — the code comment IS the evidence.
  2. **Non-code evidence** (acceptance tests, URLs, config files without comment support, file/dir existence):
     Placed directly in SRS/SDS next to the criterion.
  Without evidence of either type, the criterion stays `[ ]`.
- **Deleting an artifact orphans the evidence that cites it**: before removing a run directory, data file, or module, run `grep -rn "<name>" documents/tasks/` and annotate every `Evidence:` line the deletion breaks — say where the evidence moved, or that it was retired on purpose. Task files are permanent records and their `Evidence:` lines are NOT rewritten after the fact, but an orphaned path with no note reads as lost data. Observed 2026-08-04: removing the retired campaign dirs left three live `Evidence:` paths in two task files pointing at nothing, while the verdicts themselves were safe in the committed cells all along.
- **Acceptance-as-gate**: Every FR in SRS MUST declare a runnable `**Acceptance:**` reference — a benchmark scenario ID (flowai's own idiom, matched by `check-fr-coverage.ts`), a test `path::name`, a verification command, or `manual — <reviewer>`. Prose-only acceptance is not sufficient. An FR stays `[ ]` until its acceptance reference exists and passes on the current commit. Enforced by `plan` (DoD tuple), `review` / `review-and-commit` (FR Coverage Audit — blocking), and `commit` / `review-and-commit` (FR Acceptance Gate on SRS edits).

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

### Tasks (`documents/tasks/`)

- One file per task or session, nested new-shape path: `documents/tasks/<YYYY>/<MM>/<slug>.md` (kebab-case slug, max 40 chars). Flat `<YYYY-MM-DD>-<slug>.md` is **legacy** — tolerated with a `check-task-format` warning but SKIPPED by the commit-phase status auto-flip (FR-DOC-TASK-LIFECYCLE).
- Examples: `2026/03/add-dark-mode.md`, `2026/03/fix-auth-bug.md`.
- `status:` frontmatter is auto-derived from `## Definition of Done` checkbox state by `commit` / `review-and-commit` (all `[x]` → `done`; some → `in progress`; none → `to do`). It MUST match the DoD or `check-task-format` errors — do not hand-maintain it except `superseded`.
- Do not reuse another session's task file — create a new file. Old tasks provide context but may contain outdated decisions.
- Use GODS format for issues and plans — this is the project's **accepted task format**, and everything outside this file refers to it by that name rather than by "GODS". This file does NOT carry the format itself: the `write-gods-tasks` skill is its single source, and writing a task file starts by loading that skill.
- `documents/tasks/` is **committed and scanned** (NOT gitignored) — the doc-anchors Stop hook validates SALP tokens in task prose, so illustrative tokens must be escaped. Files accumulate — this is expected.
- **SALP in prose:** when mentioning a SALP token illustratively (not as a real cross-reference) in any committed Markdown/doc/task prose, wrap it in inline code (`` `[REF:ns:id]` ``) or a fenced block — the doc-anchors hook and `check-salp` ignore code spans but treat bare tokens in prose as live refs (a dangling one blocks turn-end).

### Framework primitive placement

When a task creates a new framework primitive, decide the subdir FIRST:

- **User-invoked via `/<name>`** (no model auto-discovery) → `framework/<pack>/commands/` with short kebab-case names. Examples: `/commit`, `/update`, `/review-and-commit`.
- **Model auto-invocable** (skill activation by description match) → `framework/<pack>/skills/` with short kebab-case names. Examples: `fix-tests`, `deep-research`.

Picking the wrong subdir fails `check-naming-prefix.ts` (NP-3) and requires a file move + SRS/SDS location edits. The CLI writer injects `disable-model-invocation: true` automatically for `commands/` — do NOT set it in source.

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

## Planning Rules

- **Environment Side-Effects**: When changes touch infra, databases, or external services, the plan must include migration, sync, or deploy steps — otherwise the change works locally but breaks in production.
- **Verification Steps**: Every plan must include specific verification commands (tests, validation tools, connectivity checks) — a plan without verification is just a wish.
- **DoD Evidence**: Every Definition of Done item MUST be paired with a runnable verification command (test name, grep pattern, validator invocation, file glob check). A DoD item without an evidence command is a wish, not a contract. When marking `[x]`, run the evidence command and capture its result — do NOT mark items based on visual code review alone. If a DoD item has multiple sub-bullets, evidence is required for EACH sub-bullet, not just the first one. This is the only safeguard against partial completion claimed as full.
- **Functionality Preservation**: Before editing any file for refactoring, run existing tests and confirm they pass — this is a prerequisite, not a suggestion. Without a green baseline you cannot detect regressions. Run tests again after all edits. Add new tests if coverage is missing.
- **Data-First**: When integrating with external APIs or processes, inspect the actual protocol and data formats before planning — assumptions about data shape are the #1 source of integration bugs.
- **Reference-First**: When spec/task file lists reference files (existing implementations, examples, format specs) — READ THEM before writing code. Do not assume data formats — verify from reference source.
- **Architectural Validation**: For complex logic changes, visualize the event sequence (sequence diagram or pseudocode) — it catches race conditions and missing edges that prose descriptions miss.
- **Variant Analysis**: When the path is non-obvious, propose variants with Pros/Cons/Risks per variant and trade-offs across them. Quality over quantity — one well-reasoned variant is fine if the path is clear. When changing a workflow primitive (skill, command, agent) that has existing benchmark coverage, ALWAYS surface ≥2 variants before editing — the "obvious path" heuristic does not apply, since primitives have multiple valid attachment points (start, mid, end, separate phase) and each has different regression risk.
- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/tasks/<YYYY>/<MM>/<slug>.md` in the accepted task format, whose template the `write-gods-tasks` skill defines — chat-only plans are lost between sessions.
- **Proactive Resolution**: Before asking the user, exhaust available resources (codebase, docs, web) to find the answer autonomously — unnecessary questions slow the workflow and signal lack of initiative.

## TDD Flow

### Code TDD (TypeScript)

1. **RED**: Write a failing test (`deno test <id>`) for new or changed logic.
2. **GREEN**: Write minimal code to pass the test.
3. **REFACTOR**: Improve code and tests without changing behavior. Re-run `deno test <id>`.
4. **CHECK**: Run `deno fmt && deno lint && deno test`. You are NOT done after GREEN — skipping CHECK leaves formatting errors and regressions undetected. This step is mandatory.

#### Code Test Rules

- Test logic and behavior only — do not test constants or templates, they change without breaking anything.
- Tests live in the same package. Testing private methods is acceptable when it improves coverage of complex internals.
- Write code only to fix failing tests or reported issues — no speculative implementations.
- No stubs or mocks for internal code. Use real implementations — stubs hide integration bugs.
- Run all tests before finishing, not just the ones you changed.
- When a test fails, fix the source code — not the test. Do not modify a failing test to make it pass, do not add error swallowing or skip logic.
- Do not create source files with guessed or fabricated data to satisfy imports — if the data source is missing, that is a blocker (see Diagnosing Failures).

### Acceptance Test TDD (Commands/Skills/Agents)

**For Skills and Commands** (same flow — `<kind>` = `skills` or `commands`):
1. **RED**: Write benchmark scenario (`framework/<pack>/<kind>/<name>/acceptance-tests/<scenario>/mod.ts`) for new/changed behavior. Run benchmark — it MUST fail (proves the scenario tests something real).
2. **GREEN**: Update SKILL.md (`framework/<pack>/<kind>/<name>/SKILL.md`) until benchmark passes.
3. **REFACTOR**: Improve text or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: ALL acceptance tests for the affected primitive run on the user side (or in CI). Hand off with the command `deno task acceptance-tests -f <primitive-id>`. Fix any reported failures by re-entering the RED→GREEN cycle on the failing scenario.

**For Agents (subagents):**
1. **RED**: Write benchmark scenario (`framework/<pack>/agents/<agent-name>/acceptance-tests/<name>/mod.ts`) for new/changed agent behavior. Use `AcceptanceTestAgentScenario` base class (field `agent` instead of `skill`). Run benchmark — it MUST fail.
2. **GREEN**: Update agent (`framework/<pack>/agents/<agent-name>.md`) until benchmark passes.
3. **REFACTOR**: Improve agent prompt or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL acceptance tests for the affected agent. Fix all failures.

**Who runs acceptance tests**:

- RED, GREEN, REFACTOR — agent runs ONLY the specific scenario(s) being authored / iterated. This is mandatory and not deferrable to the user; LLM-cost or run-duration are NOT valid reasons to defer (a single scenario is local and reversible — sandbox + cache, not in the `Executing actions with care` taxonomy).
- CHECK (full sweep across ALL scenarios for the affected primitive) — defer to the user. A primitive may carry 10–25 scenarios; running them all is hours and significant LLM cost. Author a clear hand-off message: list the new/changed scenarios already verified, the cache state, and the exact command (`deno task acceptance-tests -f <primitive-id>`) for the user to run. Do NOT run the full sweep yourself unless the user explicitly authorises it for the current task.
- When a guard (`system_health`, `process_watchdog`) blocks even a single-scenario run, report the blocker and its cause — wait, retry, or hand off explicitly. Do NOT pre-emptively use override flags or environment variables.

#### Acceptance Test Rules

- EVERY command/skill/agent change MUST have a corresponding benchmark scenario (new or existing) that covers the changed behavior.
- Write benchmark BEFORE changing the primitive (RED phase). If the benchmark already passes before the change, the scenario is not testing the right thing — revise it.
- Benchmark scenarios test OBSERVABLE BEHAVIOR (checklist items), not internal wording.
- One scenario per distinct capability or edge case. Do not overload a single scenario.
- **Grep before writing a near-duplicate scenario.** Before authoring a new scenario aimed at a specific keyword / branch label / verdict value, grep the target SKILL.md (or agent.md) for that label. If multiple labels share an identical execution path (e.g., `Request Changes` and `Needs Discussion` both route to `output report + STOP`), ONE scenario covers all of them — encode label tolerance in the checklist text rather than spawning a near-duplicate. A new file is justified only when the code path differs. Skipping this check has cost ~1h of LLM time per redundant scenario.
- Run ALL acceptance tests for the affected primitive before finishing, not just the new one.
- Commands and skills both use `AcceptanceTestScenario` (field: `skill`) — the installed IDE representation is a `SKILL.md`, regardless of the source `commands/` vs `skills/` directory. Agents use `AcceptanceTestAgentScenario` (field: `agent`).
- **Run the scenario's verification command on the UNTOUCHED fixture before planting a defect.** A scenario that damages a fixture and asks the agent to run a check is only meaningful when that check is green beforehand. Fixtures are not green by default: `framework/core/acceptance-tests/agents-rules/fixture` fails `deno task check` out of the box, because `src/fetchers/local-fetcher/fetch-content.e2e.test.ts` reads a `fixtures/` directory that is not in the repo. On a red baseline the judge cannot separate your planted failure from the ambient one. Copy the fixture to the scratch dir, run the command there, and pick one that is green — `deno lint` instead of `deno task check`, if that is what it takes. The same run tells you which tests the fixture really has: `find -name '*_test.ts'` reports nothing on a fixture whose 77 tests are named `*.test.ts`, and that empty result reads as "no coverage" when it means "wrong glob".
- **A planted defect must have exactly ONE obvious fix.** When a checklist item asks the agent to name the next step, choose a violation whose remedy is determinate: `no-unused-vars` (delete the variable) or `prefer-const` (change `let` to `const`). Not `no-explicit-any` — the correct replacement type is not knowable from the lint output, and an agent that declines to invent one is behaving correctly. Three consecutive runs were spent treating that refusal as a defect in the primitive, and one of them edited the shipped template to chase it.
- **No test-fitting.** If a benchmark fails, first determine whether the problem is in the skill/agent or in the benchmark. Signs of test-fitting: userQuery hints at the correct approach, simulatedUser/persona scripts the exact answer, mocks leak internal logic, setup pre-creates artifacts the skill should produce. Fix the skill/agent first; adjust the benchmark only if the scenario itself is wrong.
- **Mocks are static.** The hooks-based mock mechanism returns the same `reason` string for ALL invocations of the mocked tool. Do NOT use conditional logic (`if`/`case`/`$`) in mock values — it will be shown as raw text, not executed. One mock = one response.

## Diagnosing Failures

The goal is to identify the root cause, not to suppress the symptom. A quick workaround that hides the root cause is worse than an unresolved issue with a correct diagnosis.

1. Read the relevant code and error output before making any changes.
2. For benchmark behavioral failures (skill/command/agent scenario where exit code is fine but checklist score is low): READ `acceptance-tests/runs/latest/<scenario-id>/run-1/judge-evidence.md` BEFORE editing the SKILL.md. The trace shows the actual tool calls — text edits cannot fix execution paths the agent never takes (e.g., a composite skill delegating to a standalone skill via the Skill tool).
   - **Then ALWAYS open the raw agent session** — `<run>/<scenario-id>/run-1/bench-home/.claude/projects/<slug>/<uuid>.jsonl`, the transcript the sandboxed CLI wrote for itself. `judge-evidence.md` is the judge's rendering; the `.jsonl` is the ground truth, and it answers questions the rendering cannot: which tools were actually invoked (`message.content[].type == "tool_use"` → `.name`), with what parameters, and what the agent said to itself in between. Count the calls before theorising:
     `jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn` gives the whole tool histogram; `grep -c '"name":"Task"' <file>` answers a single yes/no.
     Verified 2026-08-10: two `parallel_delegation` scenarios were diagnosed for two rounds as "the harness exposes no subagent tool", on the strength of the agent's own claim ("acceptance test sandbox без subagent поддержки") quoted in `judge-evidence.md`. The raw sessions showed `Task` invoked in the runs that PASSED and absent in the runs that FAILED, with 11 agents installed under `<sandbox>/.claude/agents/` in both — the capability was there and the agent's assertion was false. A tool-call count separates "cannot" from "did not" in one command; the judge's prose never will.
   - Corollary: `[tools]` evidence lines do NOT appear in these traces — that enabler lives on the unmerged `worktree-agent-invocable-workflow-skills` branch. Do not conclude from their absence that tool-call data is unavailable; it is in the `.jsonl`.
   - **Then interview the agent that failed, when the fix is a wording change.** The sandbox outlives the run, so the session can be resumed in place and asked why: `cd "$(readlink <run>/<scenario-id>/run-N/sandbox)" && HOME="$(readlink <run>/<scenario-id>/run-N/bench-home)" claude -p --resume <uuid> "<question>"` (source `.env` first; the `<uuid>` is the `.jsonl` filename). Ask neutrally and describe the situation without accusing — what made that choice better than the alternative, which phrase in the rule left room, what the rule would have had to say, how the user's instruction was weighed against it. Answers are specific and quotable: on 2026-08-21 all three failed runs of `agents-rules-stop-analysis` named the same defective sentence in one round, after three rounds of guessing had moved nothing, and one of them added "the decision happened before I finished reading the rule — I had the solution in mind and then looked for reasons the rule didn't apply". The transcript shows what the agent DID; only the interview shows which words it justified the act with, and those are the words that need editing. Interview every failed run, not one — agreement across runs is what separates a real defect in the text from one agent's rationalisation.
3. Apply "5 WHY" analysis to find the root cause.
4. Root cause is fixable — apply the fix, retry.
5. Second fix attempt failed — STOP. Output "STOP-ANALYSIS REPORT" (state, expected, 5-why chain, root cause, hypotheses). Wait for user help.

When the root cause is outside your control (missing API keys/URLs, missing generator scripts, unavailable external services, wrong environment configuration) — STOP immediately and ask the user for the correct values. Do not guess, do not invent replacements, do not create workarounds.

## Development Commands

### Shell Environment
- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (https://no-color.org/) — disable ANSI colors when it is set.
- All project scripts auto-detect AI agent environments (`CLAUDECODE=1`) and disable ANSI colors automatically. Manual `NO_COLOR=1` prefix is not required when running from Claude Code.
- When backgrounding a long command (`run_in_background`, fire-and-poll, etc.), do NOT pipe through `tail -N` — `tail` without `-f` buffers to EOF, so the output file stays empty until the upstream exits and you cannot tell "still running" from "hung". The pipe also replaces the command's exit code with `tail`'s — a gate command (e.g. `deno task check`) MUST be run as `cmd > file 2>&1` with the verdict read from the file's summary line, never through a truncating pipe. Either let the command write directly to the output file, or use `Monitor` with `tail -f <path>`. To inspect a stuck background command, check process state with `ps -p <pid> -o pid,pcpu,etime,command` rather than relying on output presence.
- **Duration estimates: measure throughput, never anchor on human effort.** Systemic error (recurring): estimating an agent/automated-run wall-clock from HUMAN-effort proxies — SWE-bench `difficulty` labels (`<15 min fix` … `>4 hours` are human annotation times), story points, "how long would a person take." Agent wall-clock is set by `turns × tool-latency × model-throughput ÷ concurrency` and the per-session timeout cap — none of which track human cognitive effort, so the human proxy systematically INFLATES the estimate (observed: the baseline arm graded 20 instances in 31 min at concurrency 4 ≈ 6 min/instance, not the labels' "hours"). Fix, in priority order: (1) when a comparable batch already ran, derive per-item wall-clock from OBSERVED throughput (`elapsed × concurrency ÷ items_done`) and extrapolate from that number; (2) before any data exists, quote only a STRUCTURAL upper bound = `session_timeout × ceil(items ÷ concurrency)`, and label it a ceiling, not an ETA; (3) prefer to quote NO ETA when a `Monitor`/wakeup fires on the real completion event — the event is ground truth, a predicted midpoint only misleads; set the watcher's timeout from the structural ceiling. Never map a human-difficulty label onto agent wall-clock.
- **Read-before-Edit**: the Edit/Write tools require a prior Read of the same file in the current session; content seen via Bash (`grep`/`sed`/`cat`) does NOT count. After locating a hunk with grep, Read the target range before editing — skipping this fails with "File has not been read yet" (recurring across sessions).
- **Symlinked instruction files**: `CLAUDE.md` (repo root and `framework/`) are symlinks to the sibling `AGENTS.md`; file-editing tools refuse to write through symlinks. Edit the `AGENTS.md` target via Read+Edit. Writing files through shell (python/heredoc) to bypass an editing-tool refusal is forbidden — the refusal signals a wrong target, not a dead end.
- **Pre-flight hygiene before `deno task check`**: stale `deno test` children from prior sessions can hold the runner indefinitely. Verify with `ps aux | grep -E 'deno test -A' | grep -v grep`. If any have run more than ~5 min at high CPU, they are leaks — kill them.
- **Orphaned benchmark test runners (fork-storm)**: SWE-bench agent sessions run the project's own test suite inside the sandbox (e.g. `python3 tests/runtests.py <label>`), and Django's runner forks a worker pool (10 procs + a `multiprocessing.resource_tracker`). When a session dies or is killed, that pool is orphaned (reparented to PID 1) and keeps burning CPU for HOURS — a single leaked `runtests.py` produced load-per-CPU >7 and tripped `system_health`, silently aborting every subsequent session (incident 2026-07-07: two runners hung >1 day, load hit 113 on 10 CPU). Detect: `ps -Ao pid,etime,command | grep -E "tests/runtests.py|flowai-bench.*multiprocessing" | grep -v grep`. A runner is a legitimate in-flight test only if young (seconds–minutes); anything older than ~10 min with NO active bench session (`ps aux | grep '[b]enchmark.ts run'`) is an orphan — kill it (`kill -9`). Sweep after EVERY benchmark run/batch and before diagnosing any `system_health` abort. A monitor that greps only for the success marker will not see this — the load storm looks like "still running". Match on age, not presence.
- **Safe deletion in benchmark scripts/cleanup**: `rm -rf "$VAR/..."` with an unset/empty `$VAR` targets `/...`. Before any scripted `rm -rf`, guard every path component: assert the base var is non-empty AND the dir exists (`[ -n "$OUT" ] && [ -d "$OUT" ] || exit 1`), never glob a possibly-empty variable path (`"$OUT"/*.log` becomes `/*.log`), and prefer a dry-run listing (resolve each target with `pwd -P`, confirm it stays under the expected root) before the destructive pass. Recurring near-miss across sessions.

### Responsibility

Build tooling, verification, and acceptance test infrastructure for flowai.

- `scripts/*.ts` — Deno task entry points (check, test, dev, acceptance-tests)
- `scripts/acceptance-tests/lib/` — Acceptance test framework: adapter layer for IDE CLIs, scenario runner, LLM judge, trace visualization, token usage estimation
- `scripts/check-*.ts` — Validation scripts for skills and sync integrity

### Standard Interface
- `check` — the main command for comprehensive project verification. Runs the following steps in order:
  - code formatting check
  - static code analysis (linting)
  - all project tests
  - skill validation
- `test <path>` — runs a single test file or test suite.
- `dev` — runs the application in development mode with watch mode enabled.

### Detected Commands
- `deno task check` (check deno.json)
- `deno task test` (check deno.json)
- `deno task dev` (check deno.json)
- `deno task acceptance-tests` (check deno.json)

### CLI Test Caveat
- CLI test suite moved to [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli) — run `deno task check` there for the CLI side. This repo's `deno task check` covers framework + scripts only.

### `deno task check` Output Quirks

- The output ALWAYS contains three lines:
  ```
  === FAIL deno eval Deno.exit(42) ===
  === FAIL deno eval Deno.exit(1) ===
  === FAIL deno eval Deno.exit(2) ===
  ```
  These are **intentional test fixtures** inside `runCommandsInParallelBuffered` tests in `task-check_test.ts` — they verify that the parallel runner correctly reports failed sub-commands. They are NOT real failures.
- **Real verdict** comes from the final `N passed | M failed` summary lines, NOT from the presence of `=== FAIL` strings. Always grep for `failed` count, not for `FAIL`.
- If the agent stops on `=== FAIL deno eval Deno.exit(...)` without checking the summary line, it is a false alarm.
- `scripts/acceptance-tests/lib/process_watchdog_test.ts` is timing-bound: it waits up to 2000 ms for a process group to collapse, and under host load it fails with `pgid=<N> never reached 1 members within 2000 ms`. That failure does NOT mean the watchdog regressed. Before fixing anything, re-run the single file: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts`. Load noise → a DIFFERENT test of that file fails on the retry, or everything passes. A real defect → the SAME test fails three runs in a row. Observed 2026-08-04: two failures with different test names within one hour, then two clean runs, on a diff that touched no file under `scripts/acceptance-tests/`. One member of that family is no longer noise: the `rss-bloat trip` test was flaky for a real reason and was fixed on 2026-08-24, so a failure there now means the watchdog regressed. Its bloater used to allocate 80 MiB and sleep; macOS compresses untouched pages away within a second, RSS settled at 3.8 MB under 92% swap and the 10 MiB ceiling was never crossed. `scripts/acceptance-tests/lib/rss_bloat.py` now keeps every page hot, and the test trips in ~380 ms instead of burning its whole 8 s budget.

### Acceptance Test Infrastructure Smoke Test

Before writing or modifying a benchmark scenario for a command or skill, run one **existing** scenario for the same primitive to verify infrastructure works:

```sh
deno task acceptance-tests -f <existing-scenario-id>
```

If it finishes with 0 agent steps or "Unknown skill" — the acceptance test runner has an infrastructure bug (e.g., `copyFrameworkToIdeDir` not copying the primitive). Fix the runner first; do not write new scenarios on broken infrastructure.

The runner also pre-checks that `scenario.skill` is mounted in the sandbox before spawning the agent and warns on suspiciously short agent output (< 200 chars with exit 0).

- The `acceptance-tests -f` flag accepts ONE substring (last-wins on multiple). To run several scenarios: use a broader substring covering all of them, OR run sequential single-`-f` invocations. Multiple `-f` flags silently keep only the last value.
- An `acceptance-tests` run reporting "0 errors, 0 scenarios run" with exit 0 is a SETUP FAILURE, not success. Check stderr for "Error running scenario" lines. Common cause: missing `fixture/` directory referenced by the scenario's setup hook.
- **`0 agent steps` is not an auth failure until you have checked auth in a REAL environment.** `claude auth status` run under `env -i` reports `"loggedIn": false` on a fully authorised machine — the stripped environment cannot reach the credential store. Re-run it with the inherited environment before concluding anything, and read the Keychain entry's `mdat` timestamp (`security find-generic-password -s "Claude Code-credentials"`) to see when the token was last refreshed. Asking the user to log in again on the strength of an `env -i` probe spends a round-trip on a state that was already fine.
- **user-level skill collision (FR-ACCEPT-ISOLATION)**: Claude Code's Skill tool resolves `~/.claude/skills/<name>/SKILL.md` (user-level) over `<sandbox>/.claude/skills/<name>/SKILL.md` (project-level) on name collision. Without mitigation, every framework-source `SKILL.md` edit silently routes the model to the developer's installed snapshot, and the Acceptance Test TDD RED→GREEN cycle produces no observable change. Mitigation lives in `prepareAcpClaudeHome` (`scripts/acceptance-tests/lib/acp/auth.ts`, wired into the Claude profile's `prepareWorkspace`; the direct `ClaudeAdapter` was retired with the ACP migration): builds `<workDir>/bench-home/` (sibling of the sandbox; placed outside the sandbox cwd so `git status` does not flag it as untracked) with an empty `.claude/skills/` and symlinks back to `~/Library/Keychains` and `~/.local/share/claude` for OAuth/Keychain auth, then exports `HOME=<workDir>/bench-home`. `~/.claude/skills/` is never read or written by the bench. Cursor/Codex/OpenCode have no analogous bug and pass through unchanged.

### Lint Exclude / Test Ignore Drift

- `deno.json` `lint.exclude`, `deno.json` `fmt.exclude`, and `scripts/task-check.ts` `--ignore` flag must list the SAME paths (`framework/*/skills/*/acceptance-tests/`, `framework/*/commands/*/acceptance-tests/`, `framework/*/agents/*/acceptance-tests/`, `framework/*/acceptance-tests/*/fixture/`).
- These THREE locations drift in practice. When adding a new ignore pattern, update ALL THREE.
- Drift symptom A (lint vs test): `deno task check` lint passes but test phase imports fixtures as production code (`no-explicit-any` errors in `*/fixture/*.ts`).
- Drift symptom B (lint vs fmt): pre-flight `deno fmt --check` fails on intentionally malformed fixture files (e.g. a fixture seeded with deliberate formatting drift to exercise a scope-violation gate).

## CI/CD

Consumed by the `push` atom (FR-ATOM-PUSH.CI-AWAIT) to await build completion
and seed `investigate` on failure. The Status command receives the pushed SHA
via `$SHA` and MUST be single-shot (exit 0 = green, 1 = red, 2 = in-progress);
the atom enforces the iteration cap by re-invoking.

- **Provider:** github-actions
- **Status command:** `RID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --commit "$SHA" --limit 1 --json databaseId,status,conclusion); echo "$RID" | jq -e '.[0].status == "completed" and .[0].conclusion == "success"' >/dev/null && exit 0; echo "$RID" | jq -e '.[0].status == "completed"' >/dev/null && exit 1; exit 2`
- **Logs command:** `gh run view --log-failed "$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --commit "$SHA" --limit 1 --json databaseId --jq '.[0].databaseId')"`
- **Run URL command:** `gh run view --json url --jq .url "$(gh run list --commit "$SHA" --limit 1 --json databaseId --jq '.[0].databaseId')"`
- **Poll interval:** 15 seconds — green builds here run `deno task check` and complete in ~30–60 s; a 60 s poll wastes a full cache window on a build that may already be done.
- **Wall-clock budget:** 180 seconds (3 minutes) — anything longer is an anomaly (hanging job, queue starvation, runner outage). When the iteration cap (`ceil(budget / poll interval)` = 12) is exhausted without a terminal status, the push atom STOPs with a loud `CI ANOMALY` report (run URL + last-known status) instead of the silent timeout — treat a >3 min build as an incident worth manual investigation.

## Code Documentation

- **Module level**: each module gets an `AGENTS.md` describing its responsibility and key decisions.
- **Code level**: JSDoc/GoDoc for classes, methods, and functions. Focus on *why* and *how*, not *what*. Skip trivial comments — they add noise without value.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
