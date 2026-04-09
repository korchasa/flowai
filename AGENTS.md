# Core Project Rules
- Follow your assigned role strictly — it defines scope and boundaries for your actions.
- After finishing a session, review all project documents(readme.md, requirements.md, design.md, etc) to ensure they reflect the current state. Stale docs mislead future sessions.
- Verify every change by running appropriate tests or scripts — never assume correctness without evidence.
- Keep the project in a clean state: no errors, warnings, or issues in formatter and linter output. A broken baseline blocks all future work.
- Follow the TDD flow described below. Skipping it leads to untested code and regressions.
- Write all documentation in English, compressed style. Brevity preserves context window.
- If you see contradictions in the request or context, raise them explicitly, ask clarifying questions, and stop. Do not guess which interpretation is correct.
- Code should follow "fail fast, fail clearly" — surface errors immediately with clear messages rather than silently propagating bad state. Unless the user requests otherwise.
- When editing CI/CD pipelines, always validate locally first — broken CI is visible to the whole team and slow to debug remotely.
- Provide evidence for your claims — link to code, docs, or tool output. Unsupported assertions erode trust.
- Use standard tools (jq, yq, jc) to process and manage structured output — they are portable and well-understood.
- Do not add fallbacks, default behaviors, or error recovery silently — if the user didn't ask for it, it's an assumption. If you believe a fallback is genuinely needed, ask the user first.
- Do not use tables in chat output — use two-level lists instead. Tables render poorly in terminal and are harder to scan.

---
- When `typescript-lsp` plugin is enabled, it auto-removes unused exports/imports on save. When adding a new exported function, edit the consumer file (import) before or simultaneously with the provider file (export) — otherwise LSP will delete the "unused" export between edits. Alternative: use Write tool (full rewrite) instead of Edit for the provider file.
- Everything in `framework/` is the framework — the product of this project. Users install it via flowai into their IDE's config dir (`.claude/`). Do not confuse framework skills/agents with dev resources in `.claude/skills/` and `.claude/agents/`.
- Any changes to skills or agents must follow Benchmark TDD flow (see "Benchmark TDD" section below) — untested skill changes lead to regressions that are hard to detect without benchmarks.
- This is a universal framework for multiple IDEs (Cursor, Claude Code, OpenCode). Do not use tool names specific to a single IDE — write generically and provide examples for various IDEs. For example, instead of `use todo_write`, use `add to todo list (by todo_write, todowrite, etc.)`.
- Use relative paths in commands when possible — absolute paths only when required by the tool or context.
- Be precise in wording. Use a scientific approach — accompany highly specialized terms and abbreviations with short hints in parentheses.

## Project Information
- Project Name: flowai

## Project Vision
### Vision Statement

A collection of AI skills and agents, designed to standardize work across various software development contexts and AI IDEs.

### Target Audience

Developers using AI-first IDEs (Cursor, Claude Code, OpenCode)

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
- `framework/<pack>/`: Source of truth for product packs (skills, agents, hooks, scripts). Each pack has `pack.yaml` + `skills/` subdir; `agents/`, `hooks/`, `scripts/` are optional.
- `.claude/skills/`, `.claude/agents/`: Dev-only resources (not distributed). Framework skills/agents installed here by flowai.
- `documents/`: SRS/SDS and supporting documentation
- `scripts/`: Deno task scripts
- `cli/`: Distribution tool (flowai). Published to JSR as `@korchasa/flowai`. Bundles `framework/` into `cli/src/bundled.json` at publish time — zero network dependency. Uses root `deno.json` (single config). Has own tests and `CLAUDE.md`.
- `.github/workflows/ci.yml`: Unified CI/CD — checks framework + CLI, publishes to JSR on main.

## Terminology (agentskills.io)

All workflows are implemented as **Skills** according to the [agentskills.io](https://agentskills.io/home) standard (folders with `SKILL.md`). Logically, they are divided into:
- **Commands** (`flowai-*`): High-level task workflows (e.g., `/flowai-commit`). Executed by the agent upon user request, but usually not invoked by the agent itself as a tool.
- **Setup** (`flowai-setup-agent-*`): One-time project configuration commands (e.g., `flowai-setup-agent-code-style-ts-deno`). User-invoked only (`disable-model-invocation: true`), must not be triggered automatically.
- **Skills** (`flowai-skill-*`): Procedural knowledge and specialized capabilities (e.g., `flowai-skill-draw-mermaid-diagrams`). Can be discovered and used by agents to perform specific sub-tasks.

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
5. **`README.md`**: Public-facing overview. Installation, usage, quick start. Derived from AGENTS.md + SRS + SDS.

## Planning Rules

- **Environment Side-Effects**: When changes touch infra, databases, or external services, the plan must include migration, sync, or deploy steps — otherwise the change works locally but breaks in production.
- **Verification Steps**: Every plan must include specific verification commands (tests, validation tools, connectivity checks) — a plan without verification is just a wish.
- **Functionality Preservation**: Before editing any file for refactoring, run existing tests and confirm they pass — this is a prerequisite, not a suggestion. Without a green baseline you cannot detect regressions. Run tests again after all edits. Add new tests if coverage is missing.
- **Data-First**: When integrating with external APIs or processes, inspect the actual protocol and data formats before planning — assumptions about data shape are the #1 source of integration bugs.
- **Reference-First**: When spec/task file lists reference files (existing implementations, examples, format specs) — READ THEM before writing code. Do not assume data formats — verify from reference source.
- **Architectural Validation**: For complex logic changes, visualize the event sequence (sequence diagram or pseudocode) — it catches race conditions and missing edges that prose descriptions miss.
- **Variant Analysis**: When the path is non-obvious, propose variants with Pros/Cons/Risks per variant and trade-offs across them. Quality over quantity — one well-reasoned variant is fine if the path is clear.
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

### Benchmark TDD (Skills/Agents)

**For Skills:**
1. **RED**: Write benchmark scenario (`framework/<pack>/skills/<skill>/benchmarks/<name>/mod.ts`) for new/changed skill behavior. Run benchmark — it MUST fail (proves the scenario tests something real).
2. **GREEN**: Update skill (`framework/<pack>/skills/<name>/SKILL.md`) until benchmark passes.
3. **REFACTOR**: Improve skill text or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL benchmarks for the affected skill. Fix all failures.

**For Agents (subagents):**
1. **RED**: Write benchmark scenario (`framework/<pack>/agents/<agent-name>/benchmarks/<name>/mod.ts`) for new/changed agent behavior. Use `BenchmarkAgentScenario` base class (field `agent` instead of `skill`). Run benchmark — it MUST fail.
2. **GREEN**: Update agent (`framework/<pack>/agents/<agent-name>.md`) until benchmark passes.
3. **REFACTOR**: Improve agent prompt or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL benchmarks for the affected agent. Fix all failures.

#### Benchmark Rules

- EVERY skill/agent change MUST have a corresponding benchmark scenario (new or existing) that covers the changed behavior.
- Write benchmark BEFORE changing the skill/agent (RED phase). If the benchmark already passes before the change, the scenario is not testing the right thing — revise it.
- Benchmark scenarios test OBSERVABLE BEHAVIOR (checklist items), not internal wording.
- One scenario per distinct capability or edge case. Do not overload a single scenario.
- Run ALL benchmarks for the affected skill/agent before finishing, not just the new one.
- Skills use `BenchmarkSkillScenario` (field: `skill`). Agents use `BenchmarkAgentScenario` (field: `agent`).
- **No test-fitting.** If a benchmark fails, first determine whether the problem is in the skill/agent or in the benchmark. Signs of test-fitting: userQuery hints at the correct approach, simulatedUser/persona scripts the exact answer, mocks leak internal logic, setup pre-creates artifacts the skill should produce. Fix the skill/agent first; adjust the benchmark only if the scenario itself is wrong.
- **Mocks are static.** The hooks-based mock mechanism returns the same `reason` string for ALL invocations of the mocked tool. Do NOT use conditional logic (`if`/`case`/`$`) in mock values — it will be shown as raw text, not executed. One mock = one response.

## Diagnosing Failures

The goal is to identify the root cause, not to suppress the symptom. A quick workaround that hides the root cause is worse than an unresolved issue with a correct diagnosis.

1. Read the relevant code and error output before making any changes.
2. Apply "5 WHY" analysis to find the root cause.
3. Root cause is fixable — apply the fix, retry.
4. Second fix attempt failed — STOP. Output "STOP-ANALYSIS REPORT" (state, expected, 5-why chain, root cause, hypotheses). Wait for user help.

When the root cause is outside your control (missing API keys/URLs, missing generator scripts, unavailable external services, wrong environment configuration) — STOP immediately and ask the user for the correct values. Do not guess, do not invent replacements, do not create workarounds.

## Code Documentation

- **Module level**: each module gets an `AGENTS.md` describing its responsibility and key decisions.
- **Code level**: JSDoc/GoDoc for classes, methods, and functions. Focus on *why* and *how*, not *what*. Skip trivial comments — they add noise without value.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
