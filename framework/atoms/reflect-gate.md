---
name: reflect-gate
description: Close a finished session — audit how it went, criticise the findings, apply the corrective edits to the project's instruction files, show exactly what changed, and commit them once the user agrees.
_params:
  TERMINATION:
    choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
    default: TOTAL_STOP
    description: Final-step behaviour — TOTAL_STOP for standalone use and for composites where this is the last phase; HAND_OFF_TO_NEXT when a further phase follows (e.g. the Push Phase of ship), so the agent continues instead of stopping.
---

# Reflect Gate

## Overview

Runs after the work has landed. Audits the session, criticises its own
findings, applies the corrective edits to the project's instruction files,
reports each edit concretely, and commits them once the user agrees.

## Context

<context>
Split out of the commit workflow on 2026-08-17. Held inside `commit` the branch
had no hand-off form, so a composite that placed `commit` before another phase
lost that phase. The audit is performed HERE, inline — this atom does not
invoke the `reflect` skill or any other skill to do it. A sub-run ends with a
report, a report reads like the end of the work, and the turn stops there:
measured 2026-08-19, one run in three ended on the sub-run's report with the
Push Phase never reached. Inline steps have no such ending.
</context>

## Rules & Constraints

<rules>
1. **No delegation**: perform the audit yourself with the steps below. Do NOT
   invoke `reflect`, `reflect-by-history`, or any other skill for it.
2. **Edits before questions, commit after**: you apply the corrective edits
   yourself and ask exactly one question about them — whether to commit. That
   question is the only place in this atom where stopping is correct.
3. **Scope of edits**: the project's own instruction files, tracked in this
   repository — `AGENTS.md`, `**/CLAUDE.md`, and the rule/skill files they
   point at. Never application code, never a task file, never SRS/SDS, and
   never your own memory store in place of them.
4. **Git Pager**: use `GIT_PAGER=cat` for all git commands.
5. **Error Handling**: on any error (commit failure, unexpected git state):
   investigate the cause, propose a fix to the user, and **STOP** without
   making corrections.
</rules>

## Instructions

<step_by_step>
1. **Decide whether this session earned a reflection**
   - Scan the conversation and the invocation message for complexity signals:
     - Errors or failed attempts (test failures, lint errors, build errors).
     - The same action retried more than once.
     - The user correcting your approach or output.
     - Workarounds or non-obvious solutions.
     - Explicit descriptors in the invocation message — "rough session", "had to retry", "wrong approach", "failed", "had to correct you". These count on their own.
   - **Say the verdict aloud either way** — one line: `Session complexity: none detected — skipping reflection`, or `Detected retries and a user correction — reflecting`. A silent skip is indistinguishable from a forgotten step.
   - No signals → skip to the final step. Signals → continue.
   - Do NOT ask whether to reflect. That is not the user's call here; the one question in this atom comes at step 5.

2. **Audit the session**
   - **Execution flow**: where did the work go wrong, and what did it cost — failed commands, wrong assumptions, rework.
   - **Logic patterns**: looping (retrying without changing strategy), blindness (ignoring a "file not found" or a linter error), stubbornness (forcing a solution that does not fit).
   - **Technical decisions**: proportionality, conformance to existing project patterns, abstraction fit, explicit error handling, robustness, obvious inefficiency, input validation, dependency justification, and fallbacks nobody asked for.
   - **Context gaps**: project docs never opened, related source never read, relevant skills or rules never consulted, verification skipped, ambiguities resolved by guessing instead of asking.
   - **Context waste**: files read but never used, whole files read for one fragment, the same unchanged file read twice, verbose tool output that added noise.
   - **Undocumented discoveries**: knowledge gained here that changes how the project is built, run, tested or deployed. Keep what generalises; discard the one-off.
   - **Automation opportunities**: a repeated multi-step sequence (→ a skill), an undocumented convention (→ a rule), an invariant you checked by hand (→ a hook).

3. **Criticise your own findings — before you touch a file**
   - **Validity**: is each finding backed by something you can quote from this session, or is it inference? Drop or downgrade the inferred.
   - **False positives**: reading a neighbouring file to learn the pattern is not wasted context; updating a test after a deliberate behaviour change is not test-fitting.
   - **Proportionality**: a one-off annoyance does not earn a new rule. Simplify anything disproportionate.
   - **Blind spots**: which whole categories did you not look at — security, performance, documentation?
   - **Severity**: a pattern seen twice with different root causes is not recurring.
   - Say what this pass changed and why. What survives it is what you are about to write into the user's files.

4. **Apply the corrective edits**
   - Edit the instruction files directly. Each edit states the rule and the reason it exists, in the voice of the file it lands in.
   - **They land in the project's own tracked files, inside the repository working tree** — `AGENTS.md`, `**/CLAUDE.md`, and the rule or skill files those point at. Confirm it: the path you edited must appear under `git status`.
   - **Your own memory store is not a corrective edit.** Writing the lesson into the agent's persistent memory (a `memory/` directory under your home, a personal notes file, anything outside the repository) feels like it captures the finding and does not: it is not versioned, it does not reach anyone else working here, and a fresh checkout has none of it. It is also how this step gets silently skipped — measured 2026-08-19, one run in three wrote to `memory/` and reported there was nothing to commit. Use it in addition if you like, never instead.
   - One edit per surviving finding. A finding that produces no concrete edit is a report line, not a corrective action — say so and move on.
   - Keep them small and local: tighten an existing rule where one exists, add a new one only where none does.

5. **Show the edits, then ask about the commit — and end your turn on the question**
   - List what you changed, file by file: the path, the section, what the rule now says, and which finding it came from. The user must be able to judge the edit from this list without opening a diff.
   - Then ask, in one line: `Commit these edits? Reply "yes" to commit them, or "no" to leave them in the working tree.`
   - **Write nothing after the question until the reply arrives.** A question followed in the same breath by "committing now" is not a question, it is an announcement — the user never got to answer.
   - **You may not answer it on the user's behalf.** There is no default here and no pre-authorization to inherit: invoking the calling workflow authorises the commits it makes, never edits to the user's own instruction files. "The user pre-approved this" written by you, about a question you never asked, is the one way this gate fails.
   - **Do not skip the question by not editing.** If the audit produced findings and you applied none of them, say why in one line — silence here reads as a clean session, and it was not.

6. **Commit on agreement — in the same turn as the reply**
   - The reply arrives with exactly one thing left to do, and that is the trap: answering and finishing feel like the same moment, so the commit gets announced instead of made. Make it first, then write your summary.
   - On `yes`: run `git status`. Stage ONLY the files you edited in step 4, by explicit path — never `git add -A`, never `.`; a working tree you did not touch is not yours to commit. Commit with type `agent` and a scope naming what you tightened: `agent: apply reflect-suggested improvements`, or narrower, e.g. `agent(commit): tighten the doc-audit gate`. The type is `agent` because the change is to the agent's own instructions — never `docs:`, `chore:` or `feat:`, whatever the file extension says. Never amend an existing commit.
   - On `no`: leave the edits in the working tree, name the files that stay uncommitted, and do not revert them. The user declined the commit, not the analysis.
   - Then say in one line which files you committed and under which message, or which files you left behind.

{{TERMINATION}}
</step_by_step>

## Verification

<verification>
- [ ] Complexity verdict spoken aloud either way.
- [ ] Audit and self-criticism performed inline, without invoking another skill.
- [ ] Corrective edits applied and listed file by file.
- [ ] Commit question asked, and answered by the user before anything was committed.
- [ ] On agreement: one `agent:` commit staging only the edited files.
</verification>

<param-branch name="TERMINATION" value="TOTAL_STOP">
7. **TOTAL STOP**
   - Report in one line whether the reflection ran, what it changed, and under which commit. Then stop.
</param-branch>

<param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
7. **Hand off to the next phase**
   - Report in one line whether the reflection ran, what it changed, and under which commit.
   - Announce: "Reflection complete; entering the next phase of the composite workflow."
   - Do NOT issue a TOTAL STOP, and do NOT wait for the user to tell you to carry on. Continue immediately into the next phase, in this same turn.
   - **This is the step this atom exists to protect.** A reflection closes with a report, and a report reads like an ending — that is exactly how the phase after this one gets lost. Measured 2026-08-17: the calling workflow's Push Phase never ran, the commit stayed local, and the last thing written was the reflection report.
   - A declined commit does not stop the hand-off either. The edits stay in the working tree, and the next phase runs anyway.
</param-branch>
