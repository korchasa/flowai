---
name: flowai-pipeline-sdlc
description: "Local SDLC pipeline (no issue tracker): user provides task → Specification → Architect → Tech Lead → Developer+QA loop → Review"
---

# SDLC Pipeline Orchestrator (Local)

You are orchestrating a full SDLC pipeline for a user-provided task.
No issue tracker integration — the user describes the task directly.
Follow these steps EXACTLY in order.
Step 1 (Specification) is performed directly by the orchestrator.
Steps 2–6 launch subagents via the Agent tool.
Before each step, check if the expected artifact already exists — if it does, SKIP that step.

## Initialization

1. Generate `run_id` as current UTC timestamp: `YYYYMMDDTHHMMSS` format.
   Run: `date -u +"%Y%m%dT%H%M%S"`
2. Set `run_dir` = `.flowai/runs/<run_id>`
3. Create the run directory structure:
   ```
   mkdir -p <run_dir>/specification <run_dir>/design <run_dir>/decision <run_dir>/tech-lead-review
   ```
   (build/iter-N and verify/iter-N directories are created dynamically during the loop)

## Variables (track these throughout)

- `run_id`: timestamp-based run identifier
- `run_dir`: `.flowai/runs/<run_id>`
- `task_description`: the user-provided task text
- `max_iterations`: 3

---

## Step 1: Specification (PM)

**Resume check:** If `<run_dir>/specification/01-spec.md` exists, validate it has
YAML frontmatter with `scope` field (use `yq --front-matter=extract '.scope' <file>`).
If valid, SKIP to Step 2. If file exists but invalid, DELETE it and re-run Step 1.

### Analyze Task

Using the user-provided task description:
- Extract key requirements
- Identify scope: which parts of the codebase are affected
- Assess feasibility and flag contradictions
- **HARD STOP — NEVER SUBSTITUTE THE ORIGINAL TASK.** The spec MUST faithfully
  address the requirements stated by the user. Do NOT create surrogate
  or alternative tasks to work around scope limitations.

If requirements are ambiguous and you need human input:
1. Ask the user directly in chat for clarification.
2. Wait for response before proceeding.

### Write Specification

`mkdir -p <run_dir>/specification` (if not yet created), then write `<run_dir>/specification/01-spec.md`.

The file MUST begin with YAML frontmatter:

```yaml
---
scope: <affected area description>
---
```

Then MUST contain exactly these sections (Markdown H2 headings):

- **`## Problem Statement`** — What is the user/system need. Why it matters (business/technical value).
- **`## Affected Requirements`** — Reference by ID if applicable. Briefly explain how each is affected (new, modified, impacted).
- **`## Scope Boundaries`** — Explicitly list related but excluded work. Mention any deferred decisions or future follow-ups.
- **`## Summary`** — 3-5 lines: task described, changes described, key scope exclusions.

**Spec rules:**
- No implementation details. No data structures, APIs, code.
- Compressed style.
- YAML frontmatter required: `01-spec.md` MUST start with `---`.
- Fail fast: if the task contradicts existing requirements, state it explicitly rather than guessing.

---

## Step 2: Design (Architect)

**Resume check:** If `<run_dir>/design/02-plan.md` exists AND contains `## Summary`
section, SKIP to Step 3. If file exists but invalid, DELETE it and re-run Step 2.

### Launch Architect Agent

```
Agent(
  description: "Architect: design plan",
  subagent_type: "flowai-agent-architect",
  model: "opus",
  prompt: "You are the Architect agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from framework/pipeline/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Explore the codebase to understand affected areas
    - Write implementation plan with 2-3 variants to: <run_dir>/design/02-plan.md
    - Node output directory: <run_dir>/design/
    Follow your agent definition for exact steps."
)
```

---

## Step 3: Decision (Tech Lead)

**Resume check:** If `<run_dir>/decision/03-decision.md` exists AND has YAML frontmatter
with `variant` and `tasks` fields, SKIP to Step 4. If file exists but invalid, DELETE and re-run.

### Launch Tech Lead Agent

```
Agent(
  description: "Tech Lead: select variant",
  subagent_type: "flowai-agent-tech-lead",
  model: "opus",
  prompt: "You are the Tech Lead agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from framework/pipeline/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Read plan at: <run_dir>/design/02-plan.md
    - Select a variant, produce task breakdown, create branch
    - Write decision artifact to: <run_dir>/decision/03-decision.md
    - Node output directory: <run_dir>/decision/
    - Branch name: sdlc/<slug> (derive slug from task description, kebab-case, ≤40 chars)
    Follow your agent definition for exact steps."
)
```

---

## Step 4: Implementation Loop (Developer + QA)

Loop up to `max_iterations` (3) times. Track current iteration as `iter` (starts at 1).

### For each iteration:

**4a. Create iteration directories:**
```
mkdir -p <run_dir>/build/iter-<iter> <run_dir>/verify/iter-<iter>
```

**4b. Resume check (Developer):** If `<run_dir>/build/iter-<iter>/04-impl-summary.md`
exists, skip Developer and go to 4c.

### Launch Developer Agent

```
Agent(
  description: "Developer: implement iter-<iter>",
  subagent_type: "flowai-agent-developer",
  prompt: "You are the Developer agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from framework/pipeline/agents/
    - Read decision at: <run_dir>/decision/03-decision.md
    - Implement code changes following TDD
    - Write implementation summary to: <run_dir>/build/iter-<iter>/04-impl-summary.md
    - Node output directory: <run_dir>/build/iter-<iter>/
    - Iteration: <iter>
    [If iter > 1]: - Previous QA report at: <run_dir>/verify/iter-<iter-1>/05-qa-report.md — read it FIRST and fix the issues found.
    Follow your agent definition for exact steps."
)
```

**4c. Resume check (QA):** If `<run_dir>/verify/iter-<iter>/05-qa-report.md`
exists AND has valid YAML frontmatter with `verdict` field, read verdict and skip
QA launch. If file exists but invalid, DELETE it and re-run QA.

### Launch QA Agent

```
Agent(
  description: "QA: verify iter-<iter>",
  subagent_type: "flowai-agent-qa",
  prompt: "You are the QA agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from framework/pipeline/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Read decision at: <run_dir>/decision/03-decision.md
    - Read implementation summary at: <run_dir>/build/iter-<iter>/04-impl-summary.md
    - Task description: <task_description>
    - Run project checks and review changed files
    - Write QA report to: <run_dir>/verify/iter-<iter>/05-qa-report.md
    - Node output directory: <run_dir>/verify/iter-<iter>/
    - Iteration: <iter>
    Follow your agent definition for exact steps."
)
```

**4d. Read verdict:** Read `<run_dir>/verify/iter-<iter>/05-qa-report.md`.
Extract `verdict` from YAML frontmatter.

**4e. If verdict == PASS:** Exit loop. Go to Step 6.

**4f. If iter == max_iterations AND verdict != PASS:** Mark pipeline as FAILED.
Go to Step 5 (Rollback).

**4g. Otherwise:** Increment iter. Continue loop.

---

## Step 5: Rollback on Failure

This step runs ONLY if Step 4 ended with FAIL after max_iterations.

1. Discard uncommitted changes: `git checkout -- .`
2. Find the last implementation commit: `git log --oneline -5 | grep 'sdlc(impl):'`
3. If implementation commit(s) found, revert them:
   `git revert --no-edit HEAD` (for the most recent sdlc(impl) commit)
4. Log: "Pipeline failed after <max_iterations> iterations. Implementation reverted."

Report failure to the user in chat.

Proceed to Step 6.

---

## Step 6: Tech Lead Review (runs ALWAYS)

This step runs regardless of pipeline outcome (success or failure).

**Resume check:** If `<run_dir>/tech-lead-review/06-review.md` exists, SKIP.

Determine pipeline status: "success" if QA verdict was PASS, "failure" otherwise.

### Launch Tech Lead Review Agent

```
Agent(
  description: "Tech Lead Review: final review",
  subagent_type: "flowai-agent-tech-lead-review",
  prompt: "You are the Tech Lead Review agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from framework/pipeline/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Read decision at: <run_dir>/decision/03-decision.md (if exists)
    - Review the diff: git diff main...HEAD
    - Check clean working tree
    - Decide: MERGE or OPEN
    - Write review report to: <run_dir>/tech-lead-review/06-review.md
    - Node output directory: <run_dir>/tech-lead-review/
    - Pipeline status: <success|failure>
    Follow your agent definition for exact steps."
)
```

### Post-Review Actions

Read verdict from `06-review.md`.

**If MERGE:**
- Report to user: "Review passed. Code is ready to merge."

**If OPEN:**
- Report to user: "Review found issues. See report at `<run_dir>/tech-lead-review/06-review.md`."

---

## HITL (Human-in-the-Loop)

If clarification is needed at any step:
1. Ask the user directly in chat.
2. Wait for response before proceeding.

No external communication channels (issue tracker comments, etc.) are used.

## Error Handling

- **Step 1 (orchestrator) fails:** If specification cannot be written (e.g.,
  contradictions found, insufficient information), ask the user for clarification.
- **Subagent fails (Steps 2–6):** If the Agent tool returns an error, log it
  and proceed to Step 5 (Rollback) + Step 6 (Review).
- **Validation hook blocks a Write:** The subagent receives the hook's error
  message and should fix the artifact automatically (native continuation).

## Resume

This pipeline supports resume. The resume logic works by checking artifact
existence before each step. If you are resuming a previous run, determine
the `run_id` from the most recent directory in `.flowai/runs/` and continue
from the first step whose artifact is missing.

To find the latest run on resume:
```
ls -1 .flowai/runs/ | sort | tail -1
```
