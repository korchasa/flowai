---
description: Diagnose root cause using BED-LLM and discrete-outcome experiments without code modifications
---

# Investigate Issue

## Overview
Diagnose the root cause without production code modifications using BED-LLM and discrete-outcome experiments.

## Todo List
1. **Intake**
   - Briefly restate the problem
   - Read the project documentation in `./documents` directory
   - Ask for missing critical data: repo/path, OS/version/arch, revision/commit, deps, exact repro steps, expected vs actual, logs/traces, time/resource limits
   - Confirm environment boundaries (what is allowed)

2. **Hypotheses (Sample-then-Filter)**
   - Propose 5–10 candidate root causes. For each: short description, key evidence for/against, a quick probe, potential fix idea, rough cost/risk
   - Apply "sample-then-filter": drop hypotheses incompatible with known facts/logs/repro. Prevent premature collapse to too few options
   - Assign coarse probabilities (e.g., 10/30/50/70/90) and normalize

3. **Design experiments (rank by EIG)**
   - Produce 3–5 diverse experiments x1..xM: targeted tests, focused logs/asserts, config/version isolation, git bisect, last-diff inspection, static analysis/lint, web search for a specific signature, repro across env matrix
   - For each experiment define discrete outcomes Y (e.g., repro Y/N; error A/B/C; metric ↑/↓; test pass/fail; code/stack from {…})
   - For top-K hypotheses estimate p(y | θ, x) and prior p(θ). Then estimate EIG(x) = H[Σθ p(θ)p(y|θ,x)] − Σθ p(θ) H[p(y|θ,x)]. Do not use H[p(y)] alone
   - Pick the max-EIG experiment and ASK USER TO APPROVE the pair: (current working hypothesis → experiment), including rough cost/time/risk

4. **Update beliefs and decide**
   - Filter out hypotheses contradicted by observations; renormalize probabilities; maintain a "Hypothesis Board"
   - Report progress: outcomes observed, how probabilities changed, what was ruled out
   - Branching:
     a) If the working hypothesis is strongly supported (e.g., ≥85%) and a verifiable fix exists — go to step 6 (after user confirmation)
     b) If the hypothesis is weakened/falsified — PERFORM ROLLBACK: return to a clean state, document what was learned, and return to step 3
     c) Otherwise — generate a new experiment set, rank by EIG, and request approval

5. **Restore baseline**
   - Remove any diagnostic code modifications and ensure a clean worktree

## Checklist
- [ ] Problem restated; docs reviewed; boundaries confirmed
- [ ] Hypotheses listed and prioritized with probabilities
- [ ] Experiments defined with discrete outcomes and EIG
- [ ] Approval obtained for the chosen experiment
- [ ] Outcomes collected; beliefs updated; board maintained
- [ ] Quality gates passed and results shared
- [ ] Baseline restored (no stray changes)

## Turn-by-turn output format
- Summary: 2–4 sentences.
- Hypothesis Board: list {θi: p, pro/contra, quick probe, potential fix}.
- Candidate Experiments (ranked by EIG): for each x — goal, outcomes Y, execution, cost/time, EIG estimate.
- Plan Awaiting Approval: working hypothesis → chosen experiment (+ why it’s best by EIG).
- Needs from You: questions/access/limits.
- After Action (post-run): Outcomes, Updated Beliefs, Next Step.
- Do not reveal chain-of-thought; report only final conclusions and brief rationale.

## Rollback and cleanliness policy
- Any diagnostic change lives in hypothesis/* and is rolled back when falsified.
- Any product change lives in fix/* and merges only on approval.
- Between experiments the worktree is clean (empty git status).

## Hints to boost EIG in engineering
- Prefer experiments that “slice” the hypothesis space: version/flag toggles, minimal repros, dep/config isolation, git bisect on recent changes, targeted logs around control-flow forks.
- Ask the user multiple-choice questions (with “None of the above”) to keep outcomes discrete and informative.
- For web search, discretize outcomes: "≥2 matching issues with the same stack," "official regression in version X," "workaround confirmed," etc.
