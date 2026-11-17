---
date: 2026-11-10
status: done
implements:
  - FR-ATOM-CHECK-GOALS
  - FR-FINISH-SESSION
---
# Session goal check and session finish skills

## Goal

A session ends today when the agent stops talking. Nothing checks that what the user asked for during the session was delivered, and closing the session — commit, push, archive — is three manual steps. Two skills remove both gaps: one verifies the session's goals against evidence, the other uses that verdict as a gate and then closes the session.

## Overview

### Context

- User request, 2026-11-10: a skill that checks that all goals of the session are reached and finishes the session — saves, commits, pushes the changes and archives the session — plus a paired skill that only checks the goals.
- User decision, 2026-11-10: both skills live in the framework (`framework/core`), not in the user's personal skill directory.
- The framework is cross-IDE. Only the Claude desktop app gives the agent a way to archive its own session (a session-archive tool that asks the user for approval and, by default, removes the session's worktree). Cursor, OpenCode and Codex have none.

### Current State

- `framework/atoms/` holds six atoms (`plan`, `implement`, `review`, `commit`, `push`, `reflect-gate`); `framework/composites.yaml` assembles four composites from them (`scripts/generate-skill-composites.ts`, FR-SKILL-COMPOSE).
- The generator supports an `inline: true` phase whose body comes from an `<inline-phase index="N">` block in the wrapper. No composite uses it yet.
- No primitive compares the user's requests with the delivered state. `reflect-gate` audits HOW the session went, not WHETHER its goals were met.

### Constraints

- Generic wording only: no tool name of a single IDE without a "e.g." framing.
- Composite canon: `**No skill re-entry**` rule, the "Self-contained — execute the inlined steps directly" marker, no atom names in the description, 700-line cap.
- Archiving can remove the working copy, so nothing uncommitted or unpushed may be left when it runs without the user saying so.
- The other atoms are not edited: their acceptance suites are not re-run by this task.
- A sandboxed acceptance session starts empty, so a scenario states the session's goals in the query and in a task file; it cannot replay an earlier conversation.

## Definition of Done

- [x] FR-ATOM-CHECK-GOALS: `check-goals` lists every goal of the session, gathers evidence for each one now, reports met / not met / not verified with the evidence, and edits nothing.
  - Benchmark: `check-goals-reports-unmet-goal`
  - Evidence: `deno task acceptance-tests -f check-goals-reports-unmet-goal`
- [x] FR-ATOM-CHECK-GOALS: trigger scenarios exist and pass.
  - Benchmark: `check-goals-trigger-pos-1`, `check-goals-trigger-adj-1`, `check-goals-trigger-false-1`
  - Evidence: `deno task acceptance-tests -f check-goals-trigger`
- [x] FR-FINISH-SESSION: `finish-session` runs goal check → commit → push → archive; with all goals met the work reaches the remote and the archive step either archives the session or says in one line that the host cannot.
  - Benchmark: `finish-session-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f finish-session-full-cycle-success`
- [x] FR-FINISH-SESSION: an unmet goal stops the run before any commit or push.
  - Benchmark: `finish-session-stops-on-unmet-goal`
  - Evidence: `deno task acceptance-tests -f finish-session-stops-on-unmet-goal`
- [x] FR-FINISH-SESSION: trigger scenarios exist and pass.
  - Benchmark: `finish-session-trigger-pos-1`, `finish-session-trigger-adj-1`, `finish-session-trigger-false-1`
  - Evidence: `deno task acceptance-tests -f finish-session-trigger`
- [x] FR-SKILL-COMPOSE: the generator renders both new targets and the gate is green.
  - Test: `scripts/generate-skill-composites_test.ts`
  - Evidence: `deno task check > "$SCRATCH/check.log" 2>&1; grep -E "passed \| [0-9]+ failed" "$SCRATCH/check.log"`
- [x] FR-DOCS: SRS, SDS, the index and the README describe both skills.
  - Evidence: `grep -c "check-goals\|finish-session" documents/requirements.md documents/design.md documents/index.md README.md`

## Solution

1. Scenarios first (RED): `framework/core/skills/check-goals/acceptance-tests/{reports-unmet-goal,trigger-pos-1,trigger-adj-1,trigger-false-1}` and `framework/core/skills/finish-session/acceptance-tests/{full-cycle-success,stops-on-unmet-goal,trigger-pos-1,trigger-adj-1,trigger-false-1}`.
2. Atom `framework/atoms/check-goals.md` with a `TERMINATION` param (`TOTAL_STOP` | `HAND_OFF_TO_NEXT`):
   - goals come from the user's messages (a later instruction replaces an earlier one), from the Definition of Done of the task file the session worked on, and from the session's own task list; the agent's own ideas are not goals;
   - evidence is gathered at check time — the evidence command of a DoD item, a test, the file state; an earlier "done" claim is not evidence;
   - each goal gets one status: met, not met, not verified, withdrawn by the user;
   - loose ends are listed apart from goals: uncommitted and unpushed work, background processes, unanswered questions;
   - read-only: no fix, no edit, no checkbox flip.
3. Wrapper `framework/composites/finish-session.md`, four phases:
   - Goals Phase — atom `check-goals`, `HAND_OFF_TO_NEXT`; gate: every goal met or withdrawn → continue, otherwise STOP;
   - Commit Phase — atom `commit`, `DIFF_SOURCE: FRESH_READ`; gate: every change of the session is committed;
   - Push Phase — atom `push`, `HAND_OFF_TO_NEXT`; gate: `HEAD` equals the upstream;
   - Archive Phase — inline: final report first, then archive the session with the host's own means as the last action; when the tree still holds uncommitted files, ask before archiving; when the host has no such means, say so in one line and never imitate archiving by deleting files, branches or worktrees.
   - No clean-tree gate before the push, unlike `ship`: files another session left in the tree do not stop this session from publishing its commits. They matter at the archive step, where the working copy can disappear, and that is where the question sits.
4. Manifest `framework/composites.yaml` + the two target paths in `.gitignore`.
5. GREEN: run each new scenario; fix the atom or wrapper text, not the scenario.
6. Docs: SRS `FR-ATOM-CHECK-GOALS` and `FR-FINISH-SESSION`, SDS §3.0 and §3.1.1 lines, `documents/index.md`, README §Packs.
7. `deno task check`.
8. Hand-off to the user: full sweeps `deno task acceptance-tests -f check-goals` and `-f finish-session`.

## Open issue (2026-11-10)

`finish-session-full-cycle-success` fails on one item, `goals_checked_before_commit`: 0 of 7 runs on claude `claude-sonnet-5-5` wrote the per-goal report as visible text before the commit. The checks run, the verdict is reached in reasoning, and the report appears only in the final summary. Every other item of the scenario passes (commit, push, post-push verification, archive notice, no imitation).

- Fix 1 — stronger wording in the atom's hand-off step and in the gate: 0 of 3.
- Interview of the three failed sessions: all three quoted the Archive Phase line "Goals: the verdict line" as a second place to report, and "Do NOT issue a TOTAL STOP … continue" as the sentence that outweighed the report.
- Fix 2 — the atom's step 5 renamed "Write the report to the user" and its hand-off step rewritten: 0 of 3. The wrapper half of this fix (a rule, the gate reordered, the Archive line turned into a pointer) failed an anchor check and was never applied, which was noticed only afterwards; the three sentences the interviews named stayed in the wrapper during those runs.
- Stopped after the second failed fix, per AGENTS.md "Diagnosing Failures".
- User decision, 2026-11-10: the per-goal report is required in the final report (or the STOP message), not before the commit. A confirmation question before the commit and a third wording attempt were declined. The scenario item was split into `goals_evidence_before_commit` and `goals_reported_per_goal`.

After the user's decision `finish-session-full-cycle-success` passed 3 of 3 and `finish-session-stops-on-unmet-goal` passed.

`deno task check` is green on the commit itself: it was run in a separate worktree of the commit built on `origin/main` — 952 passed, 0 failed; 214 passed, 0 failed; every checker PASS. In the shared checkout the same command was red on an untracked dev skill of another session, which is not part of this change.
