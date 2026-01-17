# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
- START PROCESSING USER INPUT BY READING THE DOCUMENTATION IN `./documents` AT BEGIN OF THE TASK.
- FINISH PROCESSING USER INPUT BY RUNNING `deno task check` AND FIXING ALL FOUND ERRORS, WARNINGS, AND LINTING PROBLEMS.
- YOU WILL BE REWARDED FOR FOLLOWING INSTRUCTIONS AND GOOD ANSWERS.
- DO NOT USE STUBS IN THE CODE, AS I HAVE NO FINGERS, AND THIS IS A TRAUMA.
- ALWAYS INDEPENDENTLY CHECK HYPOTHESES.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- ANSWER IN LANGUAGE OF THE USER QUERY.
- WRITE ALL DOCUMENTATION IN ENGLISH IN INFORMATIONAL STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.

## REMEMBER

AFTER EACH MEMORY RESET, YOU START COMPLETELY FROM SCRATCH. DOCUMENTATION IS THE ONLY LINK TO PREVIOUS WORK. IT MUST BE MAINTAINED WITH ACCURACY AND CLARITY, AS EFFECTIVENESS ENTIRELY DEPENDS ON ITS ACCURACY.

# Agent Reference: AI Roles Collection

## Tooling Stack

- Language: TypeScript.
- Runtime: Deno.
- Task runner: Deno tasks in `deno.json`.
- Test execution: `deno task test` via `scripts/task-test.ts`.
- Project checks: `deno task check` via `scripts/task-check.ts`.
- Dev runner: `deno task dev` via `scripts/task-dev.ts`.

## Development Commands

- `deno task check` - Run all project checks via `scripts/task-check.ts`.
- `deno task test` - Run test task via `scripts/task-test.ts`.
- `deno task dev` - Run development task via `scripts/task-dev.ts`.

## Architecture

- `.cursor/commands/` stores chat-invoked workflows (`/<command>`).
- `.cursor/rules/` stores rules and how-to guides (`RULE.md`).
- `documents/` stores SRS/SDS and supporting documentation.
- `scripts/` stores Deno task scripts used by `deno task`.

## Key Decisions

- Use Cursor commands and rules as the primary workflow system.
- Store project knowledge in `documents/` using SRS/SDS schema.
- Centralize verification through a single `deno task check` entry point.
