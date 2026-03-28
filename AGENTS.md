# YOU MUST

- STRICTLY FOLLOW YOUR ROLE
- FIRST ACTION IN SESSION: READ ALL PROJECT DOCS. ONE-TIME PER SESSION.
- AFTER END OF SESSION, REVIEW ALL DOCUMENTS AND MAKE SURE THEY ARE ACCURATE AND UP TO DATE.
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
- BE PRECISE IN YOUR WORDING. USE A SCIENTIFIC APPROACH. ACCOMPANY HIGHLY SPECIALIZED TERMS AND ABBREVIATIONS WITH SHORT HINTS IN PARENTHESES
- PROVIDE EVIDENCE FOR YOUR CLAIMS
- USE STANDARD TOOLS (jq, yq, jc) TO PROCESS AND MANAGE OUTPUT.
- DO NOT USE TABLES IN CHAT OUTPUT. USE TWO-LEVEL LIST INSTEAD.
- ALWAYS USE RELATIVE PATHS IN COMMANDS WHEN POSSIBLE. ABSOLUTE PATHS ONLY WHEN REQUIRED BY THE TOOL OR CONTEXT.

---
- WHEN `typescript-lsp` PLUGIN IS ENABLED: IT AUTO-REMOVES UNUSED EXPORTS/IMPORTS ON SAVE. WHEN ADDING A NEW EXPORTED FUNCTION, EDIT THE CONSUMER FILE (import) BEFORE OR SIMULTANEOUSLY WITH THE PROVIDER FILE (export). OTHERWISE LSP WILL DELETE THE "UNUSED" EXPORT BETWEEN EDITS. ALTERNATIVE: USE Write TOOL (FULL REWRITE) INSTEAD OF Edit FOR THE PROVIDER FILE.
- REMEMBER, EVERYTHING IN THE framework/ FOLDER IS THE FRAMEWORK - THE PRODUCT OF THIS PROJECT. FOR USERS, THEY WILL BE INSTALLED BY flowai INTO THEIR IDE'S CONFIG DIR (.claude/). DO NOT CONFUSE FRAMEWORK SKILLS/AGENTS WITH DEV RESOURCES IN .claude/skills/ AND .claude/agents/.
- ANY CHANGES TO SKILLS MUST FOLLOW BENCHMARK TDD FLOW (see "Benchmark TDD" section below).
- REMEMBER THAT YOU ARE CREATING A UNIVERSAL FRAMEWORK SUITABLE FOR DIFFERENT IDEs(cursor, claude code, opencode). DO NOT USE TOOL NAMES SPECIFIC TO A SINGLE IDE. IT IS BETTER TO WRITE GENERICALLY AND PROVIDE EXAMPLES FOR VARIOUS IDEs. FOR EXAMPLE, INSTEAD OF `use todo_write`, USE `add to todo list (by todo_write, todowrite, etc.)`

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

## Planning Rules

- **Environment Side-Effects**: Changes to infra/DB/external services → plan MUST include migration/sync/deploy steps.
- **Verification Steps**: Plan MUST include specific verification commands (tests, validation tools, connectivity checks).
- **Functionality Preservation**: Refactoring/modifications → run existing tests before/after; add new tests if coverage missing.
- **Data-First**: Integration with external APIs/processes → inspect protocol & data formats BEFORE planning.
- **Architectural Validation**: Complex logic changes → visualize event sequence (sequence diagram/pseudocode).
- **Variant Analysis**: Non-obvious path → propose variants with Pros/Cons/Risks per variant + Trade-offs across variants. Quality > quantity. 1 variant OK if path is clear.
- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/whiteboards/<YYYY-MM-DD>-<slug>.md` using GODS format. Chat-only plans are lost between sessions.
- **Proactive Resolution**: Before asking user, exhaust available resources (codebase, docs, web) to find the answer autonomously.

## CODE DOCS

- **Module**: `AGENTS.md` (responsibility/decisions).
- **Comments**: Class/Method/Func (JSDoc/GoDoc). Why/How > What. No trivial comments.

## TDD FLOW

### Code TDD (TypeScript)

1. **RED**: Write test (`deno test <id>`) for new/changed logic or behavior.
2. **GREEN**: Pass test (`deno test <id>`).
3. **REFACTOR**: Improve code/tests. No behavior change. (`deno test <id>`).
4. **CHECK**: `deno fmt && deno lint && deno test`. Fix all.

#### Code Test Rules

- DO NOT test constants/templates. Test LOGIC/BEHAVIOR only.
- Tests in same pkg. Private methods OK.
- Code ONLY to fix tests/issues.
- NO STUBS. Real code.
- Run ALL tests before finish.

### Benchmark TDD (Skills/Agents)

1. **RED**: Write benchmark scenario (`framework/<pack>/skills/<skill>/benchmarks/<name>/mod.ts`) for new/changed skill behavior. Run benchmark — it MUST fail (proves the scenario tests something real).
2. **GREEN**: Update skill (`framework/<pack>/skills/<name>/SKILL.md`) until benchmark passes.
3. **REFACTOR**: Improve skill text or benchmark clarity. No behavior change. Re-run benchmark.
4. **CHECK**: Run ALL benchmarks for the affected skill. Fix all failures.

#### Benchmark Rules

- EVERY skill change MUST have a corresponding benchmark scenario (new or existing) that covers the changed behavior.
- Write benchmark BEFORE changing the skill (RED phase). If the benchmark already passes before the skill change, the scenario is not testing the right thing — revise it.
- Benchmark scenarios test OBSERVABLE BEHAVIOR (checklist items), not internal wording.
- One scenario per distinct capability or edge case. Do not overload a single scenario.
- Run ALL benchmarks for the affected skill before finishing, not just the new one.
