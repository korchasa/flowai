---
name: sdlc-pipeline
description: "SDLC pipeline: PM -> Architect -> Tech Lead -> Developer+QA loop -> Review"
---

# SDLC Pipeline Orchestrator

You are orchestrating a full SDLC pipeline. Follow these steps EXACTLY in order.
Each step launches a subagent via the Agent tool. Before each step, check if the
expected artifact already exists — if it does, SKIP that step.

## Initialization

1. Generate `run_id` as current UTC timestamp: `YYYYMMDDTHHMMSS` format.
   Run: `date -u +"%Y%m%dT%H%M%S"`
2. Set `run_dir` = `.flow/runs/<run_id>`
3. Create the run directory structure:
   ```
   mkdir -p <run_dir>/specification <run_dir>/design <run_dir>/decision <run_dir>/tech-lead-review
   ```
   (build/iter-N and verify/iter-N directories are created dynamically during the loop)

## Variables (track these throughout)

- `run_id`: timestamp-based run identifier
- `run_dir`: `.flow/runs/<run_id>`
- `issue_number`: extracted from `01-spec.md` frontmatter after Step 1
- `max_iterations`: 3

---

## Step 1: Specification (PM)

**Resume check:** If `<run_dir>/specification/01-spec.md` exists, validate it has
YAML frontmatter with `issue` and `scope` fields (use `yq --front-matter=extract '.issue' <file>`).
If valid, extract `issue` and SKIP to Step 2. If file exists but invalid, DELETE it and re-run Step 1.

### Issue Tracker: Select Issue

Before launching the PM agent, select the issue to work on:

```
gh issue list --state open --json number,title,labels --limit 20
```

For each candidate (up to 5), run health check:
```
gh pr list --search "head:sdlc/issue-<N>" --state merged --json number,title --jq 'length'
```

**Health criteria — issue is UNHEALTHY if ANY of:**
- Has merged PR(s) for `sdlc/issue-<N>` branch (already implemented)
- Has label `needs-triage` (previously flagged)
- Has label `wontfix` or `duplicate`

**If issue is UNHEALTHY:**
1. Add label: `gh issue edit <N> --add-label "needs-triage"`
2. Comment: `gh issue comment <N> --body "**[Pipeline]** Skipped: <reason>. Needs human review."`
3. Move to next candidate.

**If ALL candidates are unhealthy:** fail fast: "No healthy issues found."

**Selection priority:**
1. Label `in-progress` (highest — resume interrupted work)
2. Label `priority: high`
3. Oldest issue (lowest number)

Fetch issue data:
```
gh issue view <N> --json body,title,labels --jq '{title,body,labels}'
```

### Launch PM Agent

```
Agent(
  description: "PM: triage and specify",
  subagent_type: "agent-pm",
  prompt: "You are the PM agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
    - Issue data: <PASTE ISSUE TITLE, BODY, LABELS HERE>
    - Write specification artifact to: <run_dir>/specification/01-spec.md
    - Node output directory: <run_dir>/specification/
    - Run ID: <run_id>
    Follow your agent definition for exact steps."
)
```

### Issue Tracker: Post Progress

After PM completes:
```
gh issue comment <issue_number> --body "**[Pipeline · PM]** Specification phase completed."
```

Extract `issue_number` from `01-spec.md` YAML frontmatter.

---

## Step 2: Design (Architect)

**Resume check:** If `<run_dir>/design/02-plan.md` exists AND contains `## Summary`
section, SKIP to Step 3. If file exists but invalid, DELETE it and re-run Step 2.

### Issue Tracker: Post Progress

```
gh issue comment <issue_number> --body "**[Pipeline · Architect]** Design phase started."
```

### Launch Architect Agent

```
Agent(
  description: "Architect: design plan",
  subagent_type: "agent-architect",
  model: "opus",
  prompt: "You are the Architect agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Explore the codebase to understand affected areas
    - Write implementation plan with 2-3 variants to: <run_dir>/design/02-plan.md
    - Node output directory: <run_dir>/design/
    - Issue number: <issue_number>
    Follow your agent definition for exact steps."
)
```

---

## Step 3: Decision (Tech Lead)

**Resume check:** If `<run_dir>/decision/03-decision.md` exists AND has YAML frontmatter
with `variant` and `tasks` fields, SKIP to Step 4. If file exists but invalid, DELETE and re-run.

### Issue Tracker: Post Progress

```
gh issue comment <issue_number> --body "**[Pipeline · Tech Lead]** Decision phase started."
```

### Launch Tech Lead Agent

```
Agent(
  description: "Tech Lead: select variant",
  subagent_type: "agent-tech-lead",
  model: "opus",
  prompt: "You are the Tech Lead agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Read plan at: <run_dir>/design/02-plan.md
    - Select a variant, produce task breakdown, create branch
    - Write decision artifact to: <run_dir>/decision/03-decision.md
    - Node output directory: <run_dir>/decision/
    - Issue number: <issue_number>
    Follow your agent definition for exact steps."
)
```

### Issue Tracker: Create Draft PR

After Tech Lead completes, create a draft PR if one doesn't exist:
```
gh pr list --head "sdlc/issue-<issue_number>" --json number -q '.[0].number'
```

If no PR exists:
```
gh pr create --draft --title "sdlc: <issue_title>" --body "Closes #<issue_number>\n\nAutomated SDLC pipeline."
```

Post update:
```
gh issue comment <issue_number> --body "**[Pipeline · Tech Lead]** Variant selected, branch created, draft PR opened."
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

### Issue Tracker: Post Progress

```
gh issue comment <issue_number> --body "**[Pipeline · Developer]** Implementation iteration <iter> started."
```

### Launch Developer Agent

```
Agent(
  description: "Developer: implement iter-<iter>",
  subagent_type: "agent-developer",
  prompt: "You are the Developer agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
    - Read decision at: <run_dir>/decision/03-decision.md
    - Implement code changes following TDD
    - Write implementation summary to: <run_dir>/build/iter-<iter>/04-impl-summary.md
    - Node output directory: <run_dir>/build/iter-<iter>/
    - Issue number: <issue_number>
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
  subagent_type: "agent-qa",
  prompt: "You are the QA agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
    - Read specification at: <run_dir>/specification/01-spec.md
    - Read decision at: <run_dir>/decision/03-decision.md
    - Read implementation summary at: <run_dir>/build/iter-<iter>/04-impl-summary.md
    - Issue data: <PASTE ISSUE TITLE AND BODY HERE>
    - Run project checks and review changed files
    - Write QA report to: <run_dir>/verify/iter-<iter>/05-qa-report.md
    - Node output directory: <run_dir>/verify/iter-<iter>/
    - Issue number: <issue_number>
    - Iteration: <iter>
    Follow your agent definition for exact steps."
)
```

**4d. Read verdict:** Read `<run_dir>/verify/iter-<iter>/05-qa-report.md`.
Extract `verdict` from YAML frontmatter.

**4e. If verdict == PASS:** Exit loop. Go to Step 6.

### Issue Tracker: Post QA Result

```
gh issue comment <issue_number> --body "**[Pipeline · QA]** Iteration <iter>: <verdict>."
```

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

### Issue Tracker: Post Failure

```
gh issue comment <issue_number> --body "**[Pipeline]** FAILED after <max_iterations> iterations. Implementation reverted. Manual intervention required."
gh issue edit <issue_number> --add-label "needs-triage"
```

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
  subagent_type: "agent-tech-lead-review",
  prompt: "You are the Tech Lead Review agent. Your task:
    - Read shared-rules and reflection-protocol from framework/automation/agents/
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

### Issue Tracker: Post-Review Actions

Read verdict from `06-review.md`.

**If MERGE:**
```
gh pr list --head "$(git branch --show-current)" --json number -q '.[0].number'
gh pr merge <pr_number> --squash --delete-branch
gh issue comment <issue_number> --body "**[Pipeline · Review]** PR merged. Issue resolved."
```

**If OPEN:**
```
gh pr list --head "$(git branch --show-current)" --json number -q '.[0].number'
gh pr review <pr_number> --request-changes --body "**[Pipeline · Review]** Changes requested. See review report."
gh issue comment <issue_number> --body "**[Pipeline · Review]** PR left open with requested changes."
```

---

## HITL (Human-in-the-Loop)

If any subagent writes a `hitl-question.txt` file in its node output directory:
1. Read the question from the file
2. Post it to the issue tracker:
   ```
   gh issue comment <issue_number> --body "**HITL Question:**\n\n<question>\n\n---\n_Reply to this comment to answer._"
   ```
3. Poll for reply (every 60s):
   ```
   .flow/scripts/hitl-check.sh <issue_number> '<timestamp>'
   ```
   Or use the `hitl-check.ts` script if available.
4. After receiving reply, pass it to the subagent and resume.

## Error Handling

- If any subagent fails (Agent tool returns error): log the error, proceed to
  Step 5 (Rollback) + Step 6 (Review).
- If a validation hook blocks a Write: the subagent receives the hook's error
  message and should fix the artifact automatically (native continuation).

## Resume

This pipeline supports resume. The resume logic works by checking artifact
existence before each step. If you are resuming a previous run, determine
the `run_id` from the most recent directory in `.flow/runs/` and continue
from the first step whose artifact is missing.

To find the latest run on resume:
```
ls -1 .flow/runs/ | sort | tail -1
```

## Issue Tracker Integration

This section centralizes ALL issue tracker commands. To switch from GitHub to
Jira/Linear/etc., replace ONLY these commands:

- **List issues:** `gh issue list --state open --json number,title,labels --limit 20`
- **View issue:** `gh issue view <N> --json body,title,labels --jq '{title,body,labels}'`
- **Comment on issue:** `gh issue comment <N> --body "<text>"`
- **Edit issue labels:** `gh issue edit <N> --add-label "<label>"`
- **List PRs:** `gh pr list --head "<branch>" --json number -q '.[0].number'`
- **Create draft PR:** `gh pr create --draft --title "<title>" --body "<body>"`
- **Merge PR:** `gh pr merge <N> --squash --delete-branch`
- **Review PR:** `gh pr review <N> --request-changes --body "<text>"`
- **Health check (merged PRs):** `gh pr list --search "head:sdlc/issue-<N>" --state merged --json number,title --jq 'length'`
