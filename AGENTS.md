# Core Project Rules
- Follow your assigned role strictly — it defines scope and boundaries for your actions.
- After finishing a session, review all project documents (README.md, documents/requirements.md, documents/design.md, etc.) to ensure they reflect the current state. Stale docs mislead future sessions.
- Verify every change by running appropriate tests or scripts — never assume correctness without evidence.
- Keep the project in a clean state: no errors, warnings, or issues in formatter and linter output. A broken baseline blocks all future work.
- Follow the TDD flow described below. Skipping it leads to untested code and regressions.
- Write all documentation in English, compressed style. Brevity preserves context window.
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

---
- When `typescript-lsp` plugin is enabled, it auto-removes unused exports/imports on save. When adding a new exported function, edit the consumer file (import) before or simultaneously with the provider file (export) — otherwise LSP will delete the "unused" export between edits. Alternative: use Write tool (full rewrite) instead of Edit for the provider file.
- Everything in `framework/` is the framework — the product of this project. Users install it via flowai into their IDE's config dir (`.claude/`). Do not confuse framework skills/agents with dev resources in `.claude/skills/` and `.claude/agents/`.
- Any changes to skills or agents must follow Benchmark TDD flow (see "Benchmark TDD" section below) — untested skill changes lead to regressions that are hard to detect without benchmarks.
- This is a universal framework for multiple IDEs (Cursor, Claude Code, OpenCode). Do not use tool names specific to a single IDE — write generically and provide examples for various IDEs. For example, instead of `use todo_write`, use `add to todo list (by todo_write, todowrite, etc.)`.
- Use relative paths in commands when possible — absolute paths only when required by the tool or context.
- Be precise in wording. Use a scientific approach — accompany highly specialized terms and abbreviations with short hints in parentheses.
- Deno's `crypto.subtle.digest` rejects `Uint8Array` views backed by `ArrayBufferLike` (TS2345 on `BufferSource`). Pass a fresh `ArrayBuffer` instead: `const buf = new ArrayBuffer(bytes.byteLength); new Uint8Array(buf).set(bytes); await crypto.subtle.digest("SHA-256", buf);`.

## Project Information
- Project Name: flowai

## Project Vision
### Vision Statement

Assisted Engineering framework: the developer stays architect/reviewer; the AI executes under supervision. Delivered as AI skills and agents standardizing work across software development contexts and AI IDEs.

### Target Audience

Developers using AI-first IDEs (Cursor, Claude Code, OpenCode, OpenAI Codex)

### Problem Statement

AI models have a limited context window and lose information between chat sessions, leading to inconsistent development practices.

### Solution & Differentiators

Uses explicit workflows (skills), rigid verification (deno task check), and persistent memory through comprehensive documentation to maintain context and quality.

### Risks & Assumptions

Assumes users will follow the defined workflows and keep documentation up-to-date.

## Project tooling Stack
- TypeScript
- Deno
- Python (benchmark fixtures only; no production scripts)

## Architecture
- `framework/<pack>/`: Source of truth for product packs. Each pack has `pack.yaml` + two primitive dirs: `commands/` (user-only workflows) and `skills/` (agent-invocable capabilities). `agents/`, `hooks/`, `scripts/`, `assets/`, `benchmarks/` are optional.
- `.claude/skills/`, `.claude/agents/`: Dev-only resources (not distributed). Framework commands + skills install into `.claude/skills/` (commands get `disable-model-invocation: true` injected by the CLI writer).
- `documents/`: SRS/SDS and supporting documentation
- `scripts/`: Deno task scripts
- `cli/`: Distribution tool (flowai). Published to JSR as `@korchasa/flowai`. Bundles `framework/` into `cli/src/bundled.json` at publish time — zero network dependency. Uses root `deno.json` (single config). Has own tests and `CLAUDE.md`.
- `.github/workflows/ci.yml`: Unified CI/CD — checks framework + CLI, publishes to JSR on main.

## Terminology (agentskills.io)

All workflows are implemented as **Skills** according to the [agentskills.io](https://agentskills.io/home) standard (folders with `SKILL.md`). At the framework source level they are split into two sibling directories per pack, which is the **primary classifier**:

- **Commands** — `framework/<pack>/commands/<name>/SKILL.md`. User-only workflows. Invoked by the user (e.g. `/flowai-commit`); the agent does not auto-discover them. Name: `flowai-*` but NOT `flowai-skill-*` (e.g. `flowai-commit`, `flowai-review-and-commit`, `flowai-update`). Source SKILL.md MUST NOT declare `disable-model-invocation` — the CLI writer injects `disable-model-invocation: true` at sync time based on directory placement.
- **Skills** — `framework/<pack>/skills/<name>/SKILL.md`. Agent-invocable capabilities (e.g. `flowai-skill-draw-mermaid-diagrams`). Name: `flowai-skill-*`. Source SKILL.md MUST NOT declare `disable-model-invocation`.

### Two meanings of "command" — don't confuse them

1. **Framework command**: a user-only primitive under `framework/<pack>/commands/`. Installs into `.{ide}/skills/` alongside skills; the only IDE-visible difference is the injected flag. This is the sense used everywhere in this project's source tree and documentation.
2. **IDE slash command**: a flat `.md` file under `.{ide}/commands/` (e.g. `.claude/commands/my-cmd.md`). Owned by the user, managed by `flowai user-sync` for cross-IDE propagation. The CLI's `PlanItemType = "command"` refers exclusively to sense (2). Framework commands never land in this directory.

## Key Decisions
- Use agentskills.io skills as the primary workflow system
- Store project knowledge in `documents/` using SRS/SDS schema
- Centralize verification through `deno task check`
- Dev resources in `.claude/` (skills, agents). Framework resources installed by flowai

## Documentation Hierarchy
1. **`AGENTS.md`**: Project vision, constraints, mandatory rules. READ-ONLY reference.
2. **SRS** (`documents/requirements.md`): "What" & "Why". Source of truth for requirements.
3. **SDS** (`documents/design.md`): "How". Architecture and implementation. Depends on SRS.
4. **Tasks** (`documents/tasks/<YYYY-MM-DD>-<slug>.md`): Temporary plans/notes per task.
5. **IDE Differences** (`documents/ides-difference.md`): Reference. Cross-IDE capability comparison (primitives, hooks, agents, MCP). Informs FR-HOOK-DOCS–FR-IDE-SCOPE.
6. **`README.md`**: Public-facing overview. Derived from AGENTS.md + SRS + SDS. Installation, usage, pack/skill catalog, project structure. Keep in sync with framework state.

## Documentation Map

Maps source-code paths to documentation sections that describe them. Used by
`flowai-commit-beta` / `flowai-review-and-commit-beta` to find the section to
compare-and-update when each file changes. If a change touches a path below and
the mapped section contradicts new code → update the section.

- `framework/<pack>/commands/<name>/SKILL.md` → [README §Packs](README.md#packs), [FR-CMD-EXEC](documents/requirements.md#fr-cmd-exec-command-execution) / any `FR-*<NAME>*` clause, [SDS §3.1.1 Product Packs](documents/design.md#3.1.1-product-packs-framework)
- `framework/<pack>/skills/<name>/SKILL.md` → [README §Packs](README.md#packs), [FR-HOWTO](documents/requirements.md#fr-howto-automation-how-to) / any `FR-*<NAME>*` clause, [SDS §3.1.1 Product Packs](documents/design.md#3.1.1-product-packs-framework)
- `framework/<pack>/agents/<name>.md` → [SDS §3.2 Product Agents](documents/design.md#3.2-product-agents-in-packs), README §Agents (if public-facing)
- `framework/<pack>/hooks/` → SRS `FR-HOOK-*` clauses, [SDS §3.1.1 Product Packs](documents/design.md#3.1.1-product-packs-framework) (hook subsection)
- `framework/<pack>/pack.yaml` → [FR-PACKS](documents/requirements.md#fr-packs-pack-system-modular-resource-installation), [SDS §3.1.1 Product Packs](documents/design.md#3.1.1-product-packs-framework); [README §Packs](README.md#packs) when a pack is added/removed
- `framework/<pack>/assets/AGENTS.template.md` → [FR-INIT](documents/requirements.md#fr-init-project-initialization) (template variables); check README mentions
- `cli/src/sync.ts` / `cli/src/writer.ts` / `cli/src/plan.ts` → [FR-DIST.SYNC](documents/requirements.md#fr-dist.sync-sync-command-flowai) / [FR-DIST.CONFIG](documents/requirements.md#fr-dist.config-config-generation) / [FR-DIST.FILTER](documents/requirements.md#fr-dist.filter-selective-sync), [SDS §3.5 Global Framework Distribution](documents/design.md#3.5-global-framework-distribution-fr-dist-cli), [README §CLI Commands](README.md#cli-commands)
- `cli/src/migrate.ts` → [FR-DIST.MIGRATE](documents/requirements.md#fr-dist.migrate-one-way-ide-migration), [SDS §3.6 Migrate Command](documents/design.md#3.6-migrate-command-fr-dist.migrate-clisrcmigrate.ts)
- `cli/src/user_sync.ts` → [FR-DIST.USER-SYNC](documents/requirements.md#fr-dist.user-sync-cross-ide-user-resource-sync), [SDS §3.5](documents/design.md#3.5-global-framework-distribution-fr-dist-cli)
- `cli/src/update.ts` → [FR-DIST.UPDATE](documents/requirements.md#fr-dist.update-pre-flight-update-notice) / [FR-DIST.UPDATE-CMD](documents/requirements.md#fr-dist.update-cmd-self-update-subcommand), [SDS §3.10 Framework Update](documents/design.md#3.10-framework-update-skill-flowai-update)
- `cli/src/loop.ts` → [FR-LOOP](documents/requirements.md#fr-loop-non-interactive-runner-flowai-loop), [SDS §3.11 Loop Command](documents/design.md#3.11-loop-command-non-interactive-runner-fr-loop-clisrcloop.ts)
- `cli/src/adapt.ts` → [FR-ADAPT-INSTRUCTIONS](documents/requirements.md#fr-adapt-instructions-standalone-agents.md-re-adaptation-flowai-skill-adapt-instructions), [SDS §3.5.1](documents/design.md#3.5.1-agents.md-re-adaptation-skill-flowai-skill-adapt-instructions) + [§3.12](documents/design.md#3.12-standalone-primitive-adaptation-flowai-adapt)
- `scripts/benchmarks/` → SRS `FR-BENCH*` clauses, [SDS §3.4 Benchmark System](documents/design.md#3.4-benchmark-system-benchmarks-scriptsbenchmarks)
- `scripts/benchmarks/lib/cache.ts` / `benchmarks/cache/` → [FR-BENCH-CACHE](documents/requirements.md#fr-bench-cache-benchmark-result-cache), [SDS §3.4.1 Benchmark Result Cache](documents/design.md#3.4.1-benchmark-result-cache-fr-bench-cache-scriptsbenchmarkslibcache.ts)
- `scripts/check-*.ts` → SDS §5 Logic / validation rules; SRS where the rule is first defined
- `scripts/task-*.ts` → [README §CLI Commands](README.md#cli-commands)
- `documents/ides-difference.md` is READ-ONLY reference for `FR-HOOK-DOCS`..`FR-IDE-SCOPE` clauses — update only when IDE capabilities change.
- Files whose changes NEVER require doc sync: `*_test.ts`, `**/benchmarks/*/mod.ts`, `**/benchmarks/*/fixture/**`, `.github/`, `.devcontainer/`, formatting-only edits, `deno.lock`.

## Documentation Rules

Your memory resets between sessions. Documentation is the only link to past decisions and context. Keeping it accurate is not optional — stale docs actively mislead future sessions.

- Follow AGENTS.md, SRS, and SDS strictly — they define what the project is and how it works.
- Workflow for changes: new or updated requirement -> update SRS -> update SDS -> implement. Skipping steps leads to docs-code drift.
- Status markers: `[x]` = implemented, `[ ]` = pending.
- **Traceability**: Every `[x]` criterion requires evidence. Placement depends on type:
  1. **Code-evidenced**: Source files contain `// FR-<ID>` (TS/JS) or `# FR-<ID>` (YAML/shell)
     comments near implementing logic. Validated by `deno task check` (`check-traceability.ts`).
     No paths in SRS — the code comment IS the evidence.
  2. **Non-code evidence** (benchmarks, URLs, config files without comment support, file/dir existence):
     Placed directly in SRS/SDS next to the criterion.
  Without evidence of either type, the criterion stays `[ ]`.
- **Acceptance-as-gate**: Every FR in SRS MUST declare a runnable `**Acceptance:**` reference — a benchmark scenario ID (flowai's own idiom, matched by `check-fr-coverage.ts`), a test `path::name`, a verification command, or `manual — <reviewer>`. Prose-only acceptance is not sufficient. An FR stays `[ ]` until its acceptance reference exists and passes on the current commit. Enforced by `flowai-skill-plan` (DoD tuple), `flowai-skill-review` / `flowai-review-and-commit` (FR Coverage Audit — blocking), and `flowai-commit` / `flowai-review-and-commit` (FR Acceptance Gate on SRS edits).

### SRS Format (`documents/requirements.md`)

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
- **Acceptance verified by benchmarks:** `scenario-id-1`, `scenario-id-2`
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

### Framework primitive placement

When a task creates a new framework primitive, decide the subdir FIRST:

- **User-invoked via `/<name>`** (no model auto-discovery) → `framework/<pack>/commands/` with `flowai-*` prefix (but NOT `flowai-skill-*`). Examples: `/flowai-commit`, `/flowai-update`, `/flowai-review-and-commit`.
- **Model auto-invocable** (skill activation by description match) → `framework/<pack>/skills/` with `flowai-skill-*` prefix. Examples: `flowai-skill-fix-tests`, `flowai-skill-deep-research`.

Picking the wrong subdir fails `check-naming-prefix.ts` (NP-3) and requires a file move + SRS/SDS location edits. The CLI writer injects `disable-model-invocation: true` automatically for `commands/` — do NOT set it in source.

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

Every DoD item MUST pair with an FR-ID and a runnable acceptance reference. Items without this tuple are wishes, not contracts.

- [ ] FR-XXX: <observable behavior>
  - Test: `<path/to/test>::<test_name>` (or `Benchmark: <scenario-id>`)
  - Evidence: `<command that passes iff the item is done>`
- [ ] FR-YYY: <observable behavior>
  - Test: `...`
  - Evidence: `...`

## Solution

[Detailed step-by-step for SELECTED variant only. Filled AFTER user selects variant.]
```

### Compressed Style Rules (All Docs)

- No changelogs — docs reflect current state, not history.
- English only (except tasks, which may use the user's language).
- Summarize by extracting facts and compressing — no loss of information, just fewer words.
- Every word must carry meaning — no filler, no fluff, no stopwords where a shorter synonym works.
- Prefer compact formats: lists, tables, YAML, Mermaid diagrams.
- Abbreviate terms after first use — define once, abbreviate everywhere.
- Use symbols and numbers to replace words where unambiguous (e.g., `->` instead of "leads to").

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
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/tasks/<YYYY-MM-DD>-<slug>.md` using GODS format — chat-only plans are lost between sessions.
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

### Benchmark TDD (Commands/Skills/Agents)

**For Skills and Commands** (same flow — `<kind>` = `skills` or `commands`):
1. **RED**: Write benchmark scenario (`framework/<pack>/<kind>/<name>/benchmarks/<scenario>/mod.ts`) for new/changed behavior. Run benchmark — it MUST fail (proves the scenario tests something real).
2. **GREEN**: Update SKILL.md (`framework/<pack>/<kind>/<name>/SKILL.md`) until benchmark passes.
3. **REFACTOR**: Improve text or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL benchmarks for the affected primitive. Fix all failures.

**For Agents (subagents):**
1. **RED**: Write benchmark scenario (`framework/<pack>/agents/<agent-name>/benchmarks/<name>/mod.ts`) for new/changed agent behavior. Use `BenchmarkAgentScenario` base class (field `agent` instead of `skill`). Run benchmark — it MUST fail.
2. **GREEN**: Update agent (`framework/<pack>/agents/<agent-name>.md`) until benchmark passes.
3. **REFACTOR**: Improve agent prompt or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL benchmarks for the affected agent. Fix all failures.

#### Benchmark Rules

- EVERY command/skill/agent change MUST have a corresponding benchmark scenario (new or existing) that covers the changed behavior.
- Write benchmark BEFORE changing the primitive (RED phase). If the benchmark already passes before the change, the scenario is not testing the right thing — revise it.
- Benchmark scenarios test OBSERVABLE BEHAVIOR (checklist items), not internal wording.
- One scenario per distinct capability or edge case. Do not overload a single scenario.
- Run ALL benchmarks for the affected primitive before finishing, not just the new one.
- Commands and skills both use `BenchmarkSkillScenario` (field: `skill`) — the installed IDE representation is a `SKILL.md`, regardless of the source `commands/` vs `skills/` directory. Agents use `BenchmarkAgentScenario` (field: `agent`).
- **No test-fitting.** If a benchmark fails, first determine whether the problem is in the skill/agent or in the benchmark. Signs of test-fitting: userQuery hints at the correct approach, simulatedUser/persona scripts the exact answer, mocks leak internal logic, setup pre-creates artifacts the skill should produce. Fix the skill/agent first; adjust the benchmark only if the scenario itself is wrong.
- **Mocks are static.** The hooks-based mock mechanism returns the same `reason` string for ALL invocations of the mocked tool. Do NOT use conditional logic (`if`/`case`/`$`) in mock values — it will be shown as raw text, not executed. One mock = one response.

## Diagnosing Failures

The goal is to identify the root cause, not to suppress the symptom. A quick workaround that hides the root cause is worse than an unresolved issue with a correct diagnosis.

1. Read the relevant code and error output before making any changes.
2. For benchmark behavioral failures (skill/command/agent scenario where exit code is fine but checklist score is low): READ `benchmarks/runs/latest/<scenario-id>/run-1/judge-evidence.md` BEFORE editing the SKILL.md. The trace shows the actual tool calls — text edits cannot fix execution paths the agent never takes (e.g., a composite skill delegating to a standalone skill via the Skill tool).
3. Apply "5 WHY" analysis to find the root cause.
4. Root cause is fixable — apply the fix, retry.
5. Second fix attempt failed — STOP. Output "STOP-ANALYSIS REPORT" (state, expected, 5-why chain, root cause, hypotheses). Wait for user help.

When the root cause is outside your control (missing API keys/URLs, missing generator scripts, unavailable external services, wrong environment configuration) — STOP immediately and ask the user for the correct values. Do not guess, do not invent replacements, do not create workarounds.

## Development Commands

### Shell Environment
- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (https://no-color.org/) — disable ANSI colors when it is set.
- All project scripts auto-detect AI agent environments (`CLAUDECODE=1`) and disable ANSI colors automatically. Manual `NO_COLOR=1` prefix is not required when running from Claude Code.
- When backgrounding a long command (`run_in_background`, fire-and-poll, etc.), do NOT pipe through `tail -N` — `tail` without `-f` buffers to EOF, so the output file stays empty until the upstream exits and you cannot tell "still running" from "hung". Either let the command write directly to the output file, or use `Monitor` with `tail -f <path>`. To inspect a stuck background command, check process state with `ps -p <pid> -o pid,pcpu,etime,command` rather than relying on output presence.
- **Pre-flight hygiene before `deno task check`**: stale CLI children from prior sessions can hold the test runner indefinitely. Verify with `ps aux | grep -E 'cli/src/main\.ts|deno test -A cli/src' | grep -v grep`. If any have run more than ~5 min at high CPU, they are leaks — kill them. The CLI test suite spawns subprocesses via `cli/src/main.ts`; abandoned children block subsequent `deno test -A cli/src` runs (suspected port contention and lock on `cli/src/bundled.json`).

### Responsibility

Build tooling, verification, and benchmark infrastructure for flowai.

- `scripts/*.ts` — Deno task entry points (check, test, dev, bench)
- `scripts/benchmarks/lib/` — Benchmark framework: adapter layer for IDE CLIs, scenario runner, LLM judge, trace visualization, token usage estimation
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
- `deno task bench` (check deno.json)

### CLI Test Caveat
- CLI tests (`cli/src/`) require `-A` flag and MUST be run from **repo root**, not from `cli/` subdir. See `cli/CLAUDE.md` for details.

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

### Benchmark Infrastructure Smoke Test

Before writing or modifying a benchmark scenario for a command or skill, run one **existing** scenario for the same primitive to verify infrastructure works:

```sh
deno task bench -f <existing-scenario-id>
```

If it finishes with 0 agent steps or "Unknown skill" — the benchmark runner has an infrastructure bug (e.g., `copyFrameworkToIdeDir` not copying the primitive). Fix the runner first; do not write new scenarios on broken infrastructure.

The runner also pre-checks that `scenario.skill` is mounted in the sandbox before spawning the agent and warns on suspiciously short agent output (< 200 chars with exit 0).

- The bench `-f` flag accepts ONE substring (last-wins on multiple). To run several scenarios: use a broader substring covering all of them, OR run sequential single-`-f` invocations. Multiple `-f` flags silently keep only the last value.
- A bench run reporting "0 errors, 0 scenarios run" with exit 0 is a SETUP FAILURE, not success. Check stderr for "Error running scenario" lines. Common cause: missing `fixture/` directory referenced by the scenario's setup hook.

### Lint Exclude / Test Ignore Drift

- `deno.json` `lint.exclude` and `scripts/task-check.ts` `--ignore` flag must list the SAME paths (`framework/*/skills/*/benchmarks/`, `framework/*/commands/*/benchmarks/`, `framework/*/agents/*/benchmarks/`, `framework/*/benchmarks/*/fixture/`).
- These two locations drift in practice. When adding a new ignore pattern, update BOTH.
- Drift symptom: `deno task check` lint passes but `deno task check` test phase imports test fixtures as production code (`no-explicit-any` errors in `*/fixture/*.ts`).

## Code Documentation

- **Module level**: each module gets an `AGENTS.md` describing its responsibility and key decisions.
- **Code level**: JSDoc/GoDoc for classes, methods, and functions. Focus on *why* and *how*, not *what*. Skip trivial comments — they add noise without value.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
