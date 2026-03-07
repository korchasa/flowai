# flow-review-and-commit Implementation

## Goal

Implement `flow-review-and-commit` command (FR-18) — a composite skill that chains `flow-review` and `flow-commit` with a gate: review first, commit only on Approve.

## Overview

### Context

- `framework/skills/flow-review/SKILL.md` — full QA + code review skill, produces verdict (Approve / Request Changes / Needs Discussion)
- `framework/skills/flow-commit/SKILL.md` — atomic commit workflow with doc audit, pre-commit verification, grouping, execution
- FR-18 in `documents/requirements.md` defines 5 acceptance criteria (FR-18.1–FR-18.5)
- Skills are SKILL.md files in `framework/skills/<name>/` following agentskills.io standard
- Benchmarks live in `benchmarks/<skill>/scenarios/<scenario>/mod.ts` with fixture directories

### Current State

- Both `flow-review` and `flow-commit` exist as independent skills
- No `flow-review-and-commit` skill exists yet
- No benchmarks exist for `flow-review` or `flow-review-and-commit`
- Requirements table in `requirements.md` shows `flow-review-and-commit` as uncovered (no benchmarks)

## Definition of Done

- [ ] `framework/skills/flow-review-and-commit/SKILL.md` exists and follows agentskills.io format
- [ ] SKILL.md chains flow-review then flow-commit with gate logic (FR-18.2)
- [ ] Verdict-based gate: Approve → proceed to commit; Request Changes / Needs Discussion → stop and report
- [ ] Single `/flow-review-and-commit` command available (FR-18.4)
- [ ] Transparency: both review results and commit results reported (FR-18.5)
- [ ] Benchmark scenarios created to verify the skill behavior
- [ ] `deno task check` passes
- [ ] `documents/requirements.md` updated to mark FR-18 criteria as covered

## Solution

**Selected variant: B — Composite SKILL.md with delegation via skill invocation.**

### Step 1: Create `framework/skills/flow-review-and-commit/SKILL.md`

Create the orchestrator skill with:
- YAML frontmatter: `name: flow-review-and-commit`, `description: ...`, `disable-model-invocation: true`
- Overview: composite command, chains review → gate → commit
- Rules & Constraints:
  1. **Delegation**: Use `flow-review` and `flow-commit` skills as-is, do not reimplement their logic
  2. **Gate Logic**: After review, check verdict. Only Approve proceeds. Request Changes / Needs Discussion → output review report and STOP
  3. **Transparency**: Output both review findings and commit results to user
  4. **Planning**: Use task management tool to track steps
  5. **No partial commit**: If review phase itself fails (errors, crashes), STOP — do not proceed to commit
  6. **Empty diff guard**: If there are no changes to review (empty diff), report this and STOP — do not invoke review or commit
- Instructions (step_by_step):
  1. **Initialize** — create task list
  2. **Review Phase** — invoke `flow-review` skill (via `/flow-review` or skill tool). Capture full output including verdict
  3. **Gate Check** — determine verdict from review output by looking for `## Review: Approve`, `## Review: Request Changes`, or `## Review: Needs Discussion` header:
     - **Approve** → proceed to step 4
     - **Request Changes** or **Needs Discussion** → output review report to user, STOP
  4. **Commit Phase** — invoke `flow-commit` skill (via `/flow-commit` or skill tool). Let it run its full workflow (doc audit, verification, atomic grouping, execution)
  5. **Final Report** — output combined summary:
     - Review verdict + key findings (or "no issues")
     - Commit results (files committed, commit messages)
- Verification checklist matching FR-18.1–FR-18.5

### Step 2: Create benchmark directory structure

```
benchmarks/flow-review-and-commit/
  scenarios/
    approve-and-commit/       # Happy path: clean changes → Approve → commit
      fixture/
        AGENTS.md.orig
        README.md
        utils.ts              # Simple clean change
      mod.ts
    reject-stops/             # Gate test: missing requirement → Request Changes → no commit
      fixture/
        AGENTS.md.orig
        README.md             # States "calculator with division-by-zero error handling"
        calc.ts               # divide(a,b) without zero check → phantom completion
      mod.ts
```

### Step 3: Implement benchmark `approve-and-commit`

`benchmarks/flow-review-and-commit/scenarios/approve-and-commit/mod.ts`:
- `id`: `flow-review-and-commit-approve`
- `skill`: `flow-review-and-commit`
- `setup()`: git init, initial commit with README + AGENTS.md, add clean `utils.ts` as unstaged
- `userQuery`: `/flow-review-and-commit Review and commit the added sum function`
- `checklist`:
  - `review_executed` — Did the agent perform a review? (critical)
  - `review_approved` — Did the review verdict = Approve? (critical)
  - `file_committed` — Is `utils.ts` in the last commit? (critical)
  - `conventional_commits` — Commit message follows Conventional Commits? (non-critical)
  - `clean_status` — Final git status clean? (critical)

### Step 4: Implement benchmark `reject-stops`

`benchmarks/flow-review-and-commit/scenarios/reject-stops/mod.ts`:
- `id`: `flow-review-and-commit-reject`
- `skill`: `flow-review-and-commit`
- `setup()`: git init, initial commit with README stating "Project: calculator with error handling for division by zero". Add `calc.ts` that implements `divide(a, b)` as `return a / b` — no zero check, no error handling. This creates a phantom completion scenario: the README promises error handling but the code lacks it → `[critical] Missing` in QA phase.
- `userQuery`: `/flow-review-and-commit The divide function is implemented, review and commit`
- `checklist`:
  - `review_executed` — Did the agent perform a review? (critical)
  - `review_rejected` — Did the review verdict = Request Changes (not Approve)? (critical)
  - `no_commit` — No new commits created after initial? (critical)
  - `report_shown` — Did the agent output review findings to the user? (critical)

### Step 5: Update `documents/requirements.md`

- Mark FR-18.1–FR-18.5 with evidence paths to SKILL.md
- Update benchmark coverage table: `flow-review-and-commit` → `[x]` with benchmark names

### Step 6: Verify

```bash
deno task check                                              # fmt + lint + test
deno task bench -f flow-review-and-commit-approve            # happy path
deno task bench -f flow-review-and-commit-reject             # gate test
```

### Execution Order

```
Step 1 (SKILL.md) → Step 2 (benchmark dirs) → Step 3 + Step 4 (benchmarks, parallel)
                                              → Step 5 (requirements.md)
                                              → Step 6 (verify)
```

Steps 3, 4, 5 are independent after Step 2.

### Files Changed

- `framework/skills/flow-review-and-commit/SKILL.md` — NEW, step 1
- `benchmarks/flow-review-and-commit/scenarios/approve-and-commit/mod.ts` — NEW, step 3
- `benchmarks/flow-review-and-commit/scenarios/approve-and-commit/fixture/*` — NEW, step 3
- `benchmarks/flow-review-and-commit/scenarios/reject-stops/mod.ts` — NEW, step 4
- `benchmarks/flow-review-and-commit/scenarios/reject-stops/fixture/*` — NEW, step 4
- `documents/requirements.md` — EDIT, step 5
