---
name: flowai-investigate
description: Use when the user asks to diagnose a bug, find the root cause of a failing behavior, or run a controlled hypothesis-by-hypothesis investigation with experiments and evidence. Produces a diagnostic report with a recommended fix (but does not apply the fix). Do NOT trigger on "fix this bug" when the cause is obvious, or on simple error-message lookups.
argument-hint: issue description or error message
effort: high
---

# Investigate Issue

## Overview

Diagnose the root cause of an issue autonomously. Propose candidate hypotheses, pick the most promising one, run discrete-outcome experiments, update probabilities with evidence, iterate. No user checkpoints. Final report recommends a fix; it does not apply one.

## Context

<context>
Used for debugging and root cause analysis. The agent navigates the hypothesis space without HITL (human-in-the-loop) pauses. The user audits the trail through the printed Hypothesis Board and the final report.
</context>

## Rules & Constraints

<rules>
1. **No Production Changes**: Diagnostic edits (logging, probes, patches) must be reverted before the next step. The recommended fix is reported, NOT applied.
2. **Clean Baseline**: Worktree must be clean between experiments (verify via version-control status).
3. **Autonomous Flow**: Do NOT pause for user selection of hypotheses or approval of experiments. Pick the highest-probability untested hypothesis and proceed.
4. **Transparency**: Print the "Hypothesis Board" (probabilities + evidence) before each experiment and in the final report so the reasoning trail is auditable.
5. **Termination**: Stop when one hypothesis reaches ≥80% probability, when three consecutive experiments fail to shift probabilities, or after 5 iterations — whichever comes first.
6. **Task tracking**: Use a task management tool (e.g., todo write, todowrite) to record iteration state and steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Create a task list covering the steps below.
   - Gather initial data: error messages, logs, relevant source files, reproduction steps.
2. **Hypotheses Generation**
   - Propose 3-7 candidate root causes with initial probabilities (sum ≈ 100%) and one-line reasoning each.
   - Print the initial "Hypothesis Board".
3. **Experiment Loop** (autonomous; no user checkpoints)
   - Pick the highest-probability untested hypothesis.
   - Design a discrete-outcome experiment; state what "Success" and "Failure" imply for the hypothesis.
   - Execute it (read code, run commands, inspect outputs). Keep any diagnostic edits isolated and revert them afterwards.
   - Record the outcome, adjust probabilities, append evidence to the Board.
   - Verify baseline is restored and print the updated Board.
   - Evaluate the termination condition (rule 5). If not met, repeat.
4. **Final Report**
   - Print the final Hypothesis Board with the winning hypothesis highlighted.
   - Summarize each experiment: what was tested, what was observed, what it proved.
   - Recommend a concrete fix (file, line, proposed change) — do NOT apply it.
</step_by_step>

## Verification

<verification>
[ ] 3-7 hypotheses generated with initial probabilities.
[ ] Hypothesis Board printed before and after each experiment.
[ ] Agent proceeded autonomously — no user approval checkpoints.
[ ] Diagnostic changes reverted; baseline clean between experiments.
[ ] Final report names a single root cause with evidence and recommends a fix without applying it.
</verification>
