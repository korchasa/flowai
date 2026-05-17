---
name: flowai-do
description: Use when the user asks to execute an existing task plan's Solution under TDD — RED → GREEN → REFACTOR → CHECK per AGENTS.md. Requires a written plan at documents/tasks/<YYYY>/<MM>/<slug>.md. Do NOT trigger on planning, reviewing committed changes, or fixing pre-existing failing tests outside a plan.
_params:
  TERMINATION:
    choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
    default: TOTAL_STOP
    description: Final-step behaviour — TOTAL_STOP for standalone use; HAND_OFF_TO_NEXT when consumed inside a composite (flowai-ship) so the agent continues into the next phase instead of stopping.
---

# Task: Implement Plan Under TDD

## Overview

Execute the `## Solution` section of an existing task plan strictly under the TDD cycle defined in AGENTS.md: write a failing test (RED), write the minimal code that makes it pass (GREEN), improve without changing behaviour (REFACTOR), then run the project check (CHECK). Do not advance to the next iteration until CHECK is green; never edit a failing test to make it pass; never silence lint/format errors.

## Context

<context>
The user has already produced a plan (typically via `flowai-plan-exp-permanent-tasks` or `flowai-plan`). The plan file is at `documents/tasks/<YYYY>/<MM>/<slug>.md` and contains a `## Solution` section enumerating the concrete steps to implement. This skill is the Implement Phase of the canonical task lifecycle and is consumed by the `flowai-ship` composite as its second phase. The phase BEFORE this one writes the plan; the phase AFTER reviews the diff.
</context>

## Rules & Constraints

<rules>
1. **Plan is authoritative**: re-read the plan file from disk before each iteration. The `## Solution` section drives scope; deviations are forbidden.
2. **TDD strictly**: per AGENTS.md "TDD Flow" — RED → GREEN → REFACTOR → CHECK. Skipping any phase (especially the failing-test RED step) is forbidden.
3. **Never edit tests to pass**: when a test fails, fix the source — not the test. Do not add swallowing, skips, `.todo`/`xfail`, or wider mocks to silence a failure.
4. **No lint/format suppression**: `// deno-lint-ignore`, `eslint-disable`, `# noqa`, etc. are forbidden unless the rule itself is genuinely wrong (rare). If CHECK reports a lint failure, fix the code, not the rule.
5. **Scope discipline**: changes are limited to those required by the plan's `## Solution`. Out-of-scope discoveries (pre-existing failing tests, formatter drift on untouched files, missing `deno.lock`, dependency updates, README polish) are surfaced as "out-of-scope findings" in chat — NOT folded into this commit. Silently fixing them turns a no-op task into an unrequested cleanup.
6. **Stop on second-fix-failure**: per AGENTS.md "Diagnosing Failures", emit a STOP-ANALYSIS REPORT after a second failed fix attempt on the same root cause and STOP — do not keep iterating.
7. **Planning**: use a task management tool (e.g. `todo_write`, `todowrite`, `Task`) to track the Solution's steps and each RED/GREEN/REFACTOR/CHECK iteration.
8. **No-op handling**: if re-reading the plan and examining the codebase shows the requested feature is already satisfied, STOP without making any source-code changes and surface "Solution turns out to be a no-op — nothing to implement."
</rules>

## Instructions

<step_by_step>

1. **Re-read the Task File**
   - Read `documents/tasks/<YYYY>/<MM>/<slug>.md` from disk (do NOT rely on memory). The user MUST tell you the path; if it is missing, ask once.
   - Extract the `## Solution` section. The implementation steps listed there are authoritative.
   - Re-plan the todo list with the Solution's concrete steps. One todo item per RED/GREEN/REFACTOR/CHECK iteration is acceptable, but ensure every Solution bullet is represented.

2. **Determine the Project Check Command**
   - Priority: AGENTS.md / CLAUDE.md documented check command → manifest detection (`deno.json`/`deno.jsonc` → `deno task check`; `package.json` → `npm run check`/`test`/`lint`; `Makefile` `check` target → `make check`; `pyproject.toml` → `pytest` / `ruff check .`; `go.mod` → `go vet ./... && go test ./...`) → "no automated checks configured".
   - MUST NOT run a stack-specific command when its manifest is absent (any `deno *` creates `deno.lock`, any `npm *` resolves dependencies, etc.). Pre-flight artifacts in the working tree after verification are a bug.

3. **TDD Loop (per Solution step)**
   - **RED**: write a single failing test for the new/changed behaviour. Run the project test command (or the focused test if the runner supports it). It MUST fail with a message that points at the missing functionality. A test that passes immediately is not RED — revise the test until it fails for the right reason.
   - **GREEN**: write the minimal production code that makes the failing test pass. Do NOT add features or speculative code paths beyond what the test demands.
   - **REFACTOR**: improve names, structure, duplication, and tests without changing observable behaviour. Re-run the tests after each refactor — they MUST still pass. If refactor breaks a test, STOP and decide: is the test wrong, or did the refactor change behaviour? Revert the refactor if behaviour drifted.
   - **CHECK**: run the project check command from step 2. It MUST exit 0. If it fails:
     - **Within Solution scope**: fix the root cause. Do NOT disable lint rules or silence formatter output. On a second fix attempt that also fails, STOP and emit STOP-ANALYSIS REPORT per AGENTS.md "Diagnosing Failures".
     - **Pre-existing / out-of-scope**: surface as "out-of-scope finding"; do NOT fix here.

4. **Repeat per Solution step**
   - After CHECK is green for the current Solution step, return to RED for the next step. Update the todo list status.
   - When all Solution steps are implemented and CHECK is green, proceed to the final step.

5. **Final Verification**
   - Run the project check command one last time on the full project (not just the changed file). It MUST exit 0.
   - Confirm `git status` is non-empty (otherwise the Solution was a no-op — surface that and STOP).
   - Confirm no scope creep: every changed file maps to a Solution bullet.

6. **{{TERMINATION}}**

</step_by_step>

## Verification

<verification>
- [ ] Plan file re-read from disk; Solution section drove the implementation scope.
- [ ] Every Solution step went through RED → GREEN → REFACTOR → CHECK.
- [ ] No test was edited to make a failing assertion pass.
- [ ] No lint/format suppression added (no `// deno-lint-ignore`, `eslint-disable`, `# noqa`, etc.).
- [ ] Final project check exits 0 on the whole project.
- [ ] `git status` is non-empty AND every changed file maps to a Solution bullet.
- [ ] Out-of-scope findings surfaced separately and NOT folded into this work.
- [ ] STOP-ANALYSIS REPORT emitted on second-fix-failure (if any).
</verification>

<param-branch name="TERMINATION" value="TOTAL_STOP">
6. **TOTAL STOP**
   - Report: Solution steps completed, final check result, files changed (one bullet per file).
</param-branch>

<param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
6. **Hand off to the next phase**
   - Report: Solution steps completed, final check result, files changed (one bullet per file).
   - Announce: "Implementation complete; entering the next phase of the composite workflow."
   - Do NOT issue a TOTAL STOP. Continue immediately into the next phase.
</param-branch>
