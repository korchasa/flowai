# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
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

---
- REMEMBER, EVERYTHING IN THE framework/ FOLDER IS THE FRAMEWORK - THE PRODUCT OF THIS PROJECT. FOR USERS, THEY WILL BE STORED IN THEIR IDE'S CONFIG DIR (.cursor/, .claude/, .opencode/). DO NOT CONFUSE AGENTS AND SKILLS AS A PRODUCT WITH DEV RESOURCES IN .dev/.
- ANY CHANGES TO SKILLS MUST BE TESTED THROUGH BENCHMARKS, LIKE TDD FOR CODE.
- REMEMBER THAT YOU ARE CREATING A UNIVERSAL FRAMEWORK SUITABLE FOR DIFFERENT IDEs(cursor, claude code, antigravity, openai codex, opencode). DO NOT USE TOOL NAMES SPECIFIC TO A SINGLE IDE. IT IS BETTER TO WRITE GENERICALLY AND PROVIDE EXAMPLES FOR VARIOUS IDEs. FOR EXAMPLE, INSTEAD OF `use todo_write`, USE `add to todo list (by todo_write, todowrite, etc.)`

## Project Information
- Project Name: AssistFlow

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
- Python

## Architecture
- `.dev/`: SPOT for dev resources (skills, agents, hooks, IDE configs). Symlinked to IDE dirs via `deno task link`.
- `framework/skills/`: Source of truth for product skills (logical Commands and Skills)
- `framework/agents/`: Source of truth for product agents
- `documents/`: SRS/SDS and supporting documentation
- `scripts/`: Deno task scripts

## Terminology (agentskills.io)

All workflows are implemented as **Skills** according to the [agentskills.io](https://agentskills.io/home) standard (folders with `SKILL.md`). Logically, they are divided into:
- **Commands** (`flow-*`): High-level task workflows (e.g., `/flow-commit`). Executed by the agent upon user request, but usually not invoked by the agent itself as a tool.
- **Skills** (`flow-skill-*`): Procedural knowledge and specialized capabilities (e.g., `flow-skill-draw-mermaid`). Can be discovered and used by agents to perform specific sub-tasks.

## Key Decisions
- Use Cursor skills and commands as the primary workflow system
- Store project knowledge in `documents/` using SRS/SDS schema
- Centralize verification through `deno task check`
- Dev resources in `.dev/` (SPOT), symlinked to `.cursor/`, `.claude/`, `.opencode/` for multi-IDE support

## Planning Rules

- **Environment Side-Effects**: Changes to infra/DB/external services → plan MUST include migration/sync/deploy steps.
- **Verification Steps**: Plan MUST include specific verification commands (tests, validation tools, connectivity checks).
- **Functionality Preservation**: Refactoring/modifications → run existing tests before/after; add new tests if coverage missing.
- **Data-First**: Integration with external APIs/processes → inspect protocol & data formats BEFORE planning.
- **Architectural Validation**: Complex logic changes → visualize event sequence (sequence diagram/pseudocode).
- **Variant Analysis**: Non-obvious path → propose variants with Pros/Cons. Quality > quantity. 1 variant OK if path is clear.
- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/whiteboard.md` using GODS format. Chat-only plans are lost between sessions.
- **Proactive Resolution**: Before asking user, exhaust available resources (codebase, docs, web) to find the answer autonomously.

## CODE DOCS

- **Module**: `AGENTS.md` (responsibility/decisions).
- **Comments**: Class/Method/Func (JSDoc/GoDoc). Why/How > What. No trivial comments.

## TDD FLOW

1. **RED**: Write test (`deno test <id>`) for new/changed logic or behavior.
2. **GREEN**: Pass test (`deno test <id>`).
3. **REFACTOR**: Improve code/tests. No behavior change. (`deno test <id>`).
4. **CHECK**: `deno fmt && deno lint && deno test`. Fix all.

### Test Rules

- DO NOT test constants/templates. Test LOGIC/BEHAVIOR only.
- Tests in same pkg. Private methods OK.
- Code ONLY to fix tests/issues.
- NO STUBS. Real code.
- Run ALL tests before finish.
