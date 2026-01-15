---
description: Diagnose root cause using BED-LLM and experiments
---

# Investigate Issue

## Overview
Diagnose the root cause without production code modifications using BED-LLM and discrete-outcome experiments.

## Context
<context>
Used for debugging and root cause analysis without introducing permanent changes to the codebase.
</context>

## Rules & Constraints
<rules>
1. **No Production Changes**: Diagnostic changes must be rolled back or isolated.
2. **Clean Baseline**: Worktree must be clean between experiments.
3. **EIG Ranking**: Rank experiments by Expected Information Gain.
4. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Intake**
   - Restate problem and gather missing critical data (logs, repro steps, etc.). If the `AskQuestion` tool is available, use it for gathering data from the user.
3. **Hypotheses**
   - Propose 5-10 candidate root causes with probabilities.
   - Apply sample-then-filter.
4. **Design Experiments**
   - Produce 3-5 diverse experiments ranked by EIG.
   - Pick max-EIG experiment and get user approval.
5. **Update Beliefs**
   - Run experiment, collect outcomes, and update hypothesis board.
   - Branch to fix or next experiment.
6. **Restore Baseline**
   - Remove diagnostic changes and ensure clean worktree.
</step_by_step>

## Verification
<verification>
- [ ] Hypotheses prioritized with probabilities.
- [ ] Max-EIG experiment approved and executed.
- [ ] Outcomes collected and beliefs updated.
- [ ] Baseline restored (no stray changes).
</verification>
