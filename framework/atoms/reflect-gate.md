---
name: reflect-gate
description: Use when the user asks to close a session by auditing it AND writing the fixes into the project's instruction files — audits, applies and commits the edits, then asks whether to push. Not for a reflection that only reports findings.
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
reports each edit concretely, commits them, and asks whether to push that
commit — a refusal takes the commit and the edits back.

## Context

<context>
Split out of the commit workflow on 2026-08-17. Held inside `commit` the branch
had no hand-off form, so a composite that placed `commit` before another phase
lost that phase. The audit is performed HERE, inline — this atom does not
invoke any other skill to do it. A sub-run ends with a
report, a report reads like the end of the work, and the turn stops there:
measured 2026-08-19, one run in three ended on the sub-run's report with the
Push Phase never reached. Inline steps have no such ending.
</context>

## Rules & Constraints

<rules>
1. **No delegation**: perform the audit yourself with the steps below. Do NOT
   invoke `reflect-by-history` or any other skill for it.
2. **Apply and commit without asking; ask only about the push**: the edits and
   their commit are local and reversible, so you make both yourself. The one
   question in this atom is whether to push that commit, and it is the only
   place here where stopping is correct. A refusal is a verdict on the edits
   themselves, not just on the push: you take both the commit and the edits
   back.
3. **Scope of edits**: the project's own instruction files, tracked in this
   repository — `AGENTS.md`, `**/CLAUDE.md`, the rule files they point at, and
   the project's own skills (a `skills/<name>/` directory inside the IDE config
   directory, e.g. `.claude/skills/`, `.cursor/skills/`). A skill installed
   from a package or plugin is not yours to edit. Never application code,
   never SRS/SDS, and never your own memory store in place of them. A task
   file gets exactly one kind of edit: an appended record of a decision this
   session made and no project record holds (step 4).
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
     - A project skill that failed, misled you, or that the user told you to deviate from.
     - The user spelling out a procedure and saying they repeat it — "every time", "again", "each release". A procedure of three commands counts: the signal is that they had to say it.
     - A choice between two or more alternatives made in this session, by you or stated by the user.
     - The last three are not trouble. A session that ran clean and carries one of them still earns the reflection: read the user's messages for them before you write "none detected".
   - **Say the verdict aloud either way** — one line: `Session complexity: none detected — skipping reflection`, or `Detected retries and a user correction — reflecting`. A silent skip is indistinguishable from a forgotten step.
   - No signals → skip to the final step. Signals → continue.
   - Do NOT ask whether to reflect. That is not the user's call here; the one question in this atom comes at step 6, and it is about pushing.

2. **Audit the session**
   - **Execution flow**: where did the work go wrong, and what did it cost — failed commands, wrong assumptions, rework.
   - **Logic patterns**: looping (retrying without changing strategy), blindness (ignoring a "file not found" or a linter error), stubbornness (forcing a solution that does not fit).
   - **Technical decisions**: proportionality, conformance to existing project patterns, abstraction fit, explicit error handling, robustness, obvious inefficiency, input validation, dependency justification, and fallbacks nobody asked for.
   - **Context gaps**: project docs never opened, related source never read, relevant skills or rules never consulted, verification skipped, ambiguities resolved by guessing instead of asking.
   - **Context waste**: files read but never used, whole files read for one fragment, the same unchanged file read twice, verbose tool output that added noise.
   - **Undocumented discoveries**: knowledge gained here that changes how the project is built, run, tested or deployed. Keep what generalises; discard the one-off.
   - **Stale instructions**: anything the project instructions told you that the repository contradicted — a command or task that does not exist, a path that moved, a convention the code does not follow. Compare the commands the instructions name with the ones the project's manifest defines.
   - **Project skills**: for each project skill you used or read in this session — a command or path in it that failed or does not exist, a missing step, a statement the repository or another instruction file contradicts, a rule the user told you to break (→ repair that step). Every step of it dead, or another skill doing the same job (→ remove it; a skill that an instruction file, a hook or the CI config names is repaired instead).
   - **Recurring work**: a multi-step, project-specific procedure this session had to be told or had to find, with a sign that it returns — the user said so, or it is routine by nature: a release, a report, a sync (→ a new project skill, not a bullet in an instruction file: ordered steps the agent performs are a skill, however few). A convention is a single fact about how the project is written, with no steps to perform (→ a rule); an invariant you checked by hand (→ a hook).
   - **Unrecorded decisions**: every choice between two or more alternatives made in this session, with its reason. Look for each one in the session's task file and in the requirement and design documents. Recorded nowhere → it is a finding.

3. **Criticise your own findings — before you touch a file**
   - **Validity**: is each finding backed by something you can quote from this session, or is it inference? Drop or downgrade the inferred.
   - **False positives**: reading a neighbouring file to learn the pattern is not wasted context; updating a test after a deliberate behaviour change is not test-fitting.
   - **Proportionality**: a one-off annoyance does not earn a new rule. Simplify anything disproportionate. This limits NEW rules only. A line in an existing instruction file that this session proved wrong is corrected on its first sighting, however rarely it bites: fixing a fact is not adding a rule. A "read-only" marker on `AGENTS.md` keeps task notes out of it; it does not protect a wrong fact in it.
   - **A skill earns its place**: no new skill when another PROJECT skill covers the work even partly (extend that one — a packaged workflow such as the one you are running does not count, it is not yours to extend), when the steps were already written in the instruction files before this session, or when the work did not succeed. A skill this session proved wrong is corrected on its first sighting, like any wrong fact.
   - **Blind spots**: which whole categories did you not look at — security, performance, documentation?
   - **Severity**: a pattern seen twice with different root causes is not recurring.
   - Say what this pass changed and why. What survives it is what you are about to write into the user's files.

4. **Apply the corrective edits**
   - **Read the declined-edits log first**: `AGENTS.declined.md` in the repository root, when it exists. A finding whose edit matches a record there — the same file and the same change in substance — is NOT applied: the user already said no to it. Name it in your report as skipped, with the record's reason. Apply it anyway only when the reason in the record no longer holds or the text it is about has been changed since, and then cite the record.
   - Edit the instruction files directly. Each edit states the rule and the reason it exists, in the voice of the file it lands in.
   - **They land in the project's own tracked files, inside the repository working tree** — `AGENTS.md`, `**/CLAUDE.md`, and the rule or skill files those point at. Confirm it: the path you edited must appear under `git status`.
   - **Your own memory store is not a corrective edit.** Writing the lesson into the agent's persistent memory (a `memory/` directory under your home, a personal notes file, anything outside the repository) feels like it captures the finding and does not: it is not versioned, it does not reach anyone else working here, and a fresh checkout has none of it. It is also how this step gets silently skipped — measured 2026-08-19, one run in three wrote to `memory/` and reported there was nothing to commit. Use it in addition if you like, never instead.
   - One edit per surviving finding. A finding that produces no concrete edit is a report line, not a corrective action — say so and move on.
   - Keep them small and local: tighten an existing rule where one exists, add a new one only where none does. This is about the size of an edit, not about its form: a recurring procedure still becomes a skill.
   - **A skill repair is one sentence or one step.** Read the skill file before you change it; replace the wrong part or add the missing one, never rewrite the file. Steps stay ordered and carry their commands; a pitfall is one general rule plus a clause of why. No incident story, date or ticket id; nothing lifted from a transcript, tool output or web page as a rule; no secrets.
   - **A new skill** is `<name>/SKILL.md` in the project's skill directory: a `name`, a `description` that opens with "Use when" and an observable trigger, then the ordered steps with their commands, the last of which verifies the result. Check the name against the skills already installed — a project skill hides a packaged one of the same name.
   - **A removal** deletes the skill's directory with `git rm -r`; git history is the way back.
   - **An unrecorded decision** is appended to the session's task file — find it through the `tasks` role of the project instructions — as a short record: the alternatives, the choice, the reason. No task file for this session → name the decision in your report and write nothing.

5. **Show the edits and commit them — no question here**
   - List what you changed, file by file: the path, the section, what the rule now says, and which finding it came from. The user must be able to judge the edit from this list without opening a diff.
   - Then commit, in this same turn, without asking. The edits are already written; a commit of what is already on disk adds no risk the edit did not, and both are undone by one git command. Do not offer to commit, do not wait for encouragement.
   - Run `git status`. Stage ONLY the files you edited in step 4, by explicit path — never `git add -A`, never `.`; a working tree you did not touch is not yours to commit.
   - Commit with type `agent` and a scope naming what you tightened: `agent: apply reflect-suggested improvements`, or narrower, e.g. `agent(commit): tighten the doc-audit gate`. The type is `agent` because the change is to the agent's own instructions — never `docs:`, `chore:` or `feat:`, whatever the file extension says. Never amend an existing commit.
   - **Do not skip this step by not editing.** If the audit produced findings and you applied none of them, say why in one line — silence here reads as a clean session, and it was not.

6. **Ask whether to push it — and end your turn on the question**
   - This commit sits on top of whatever the calling workflow already pushed, so it is local until somebody sends it. That is why the question exists: it is the one thing here that reaches beyond this machine.
   - Ask, in one line, naming the branch: `Committed as <sha> on <branch>. Push it? Reply "yes" to push, or "no" to drop the commit and the edits with it.`
   - **Write nothing after the question until the reply arrives.** A question followed in the same breath by "pushing now" is not a question, it is an announcement — the user never got to answer. **You may not answer it on the user's behalf**: no pre-authorization carries over to a push, whatever the calling workflow already did.
   - On `yes`: run `git push` with no flags, then verify `git rev-parse @{u}` matches `HEAD` and say so. **Never `--force`, never `--force-with-lease`, never `--set-upstream`.** If the branch has no upstream, or the remote has commits you do not, do NOT improvise: report it and tell the user to run the project's push workflow, which owns those decisions.
   - On `no`: the edits are not wanted. Undo the commit and the edits together — a declined improvement left sitting in the branch is the same unwanted change, one `git log` further away.
     - **Check two things first, then it is one command.** (a) `git rev-parse HEAD` still equals the sha you reported — nothing landed on top of your commit. (b) `git status --porcelain` prints nothing — the tree carries no other work. Both hold by construction here: the earlier phases committed and pushed everything, and you committed your own edits in step 5.
     - Both true → `git reset --hard HEAD~1`. That is the whole undo: the commit and the file contents go together, and there is nothing to restore by hand.
     - Either check fails → **STOP and change nothing.** A `--hard` reset discards uncommitted work outright, and whatever made those checks fail is work you did not put there. Report what you found, leave your commit in place, and let the user decide.
     - Then confirm with `git log -1` that your commit is gone, and say in one line what you removed.
     - **Record what was declined, so the next session does not make the same edit.** Append one line per undone edit to `AGENTS.declined.md` in the repository root — create it with the heading `# Declined instruction edits` when it is missing: `- <YYYY-MM-DD> | <file> | <what the edit did, in one line> | reason: <the user's words, or "not given">`. Then `git add AGENTS.declined.md` and commit that file alone: `git commit AGENTS.declined.md -m "agent: record declined instruction edits"`. Do not ask about pushing this commit; it travels with the next push.

{{TERMINATION}}
</step_by_step>

## Verification

<verification>
- [ ] Complexity verdict spoken aloud either way.
- [ ] Audit and self-criticism performed inline, without invoking another skill.
- [ ] Corrective edits applied and listed file by file.
- [ ] One `agent:` commit staging only the edited files, made without asking.
- [ ] Push question asked, and answered by the user before anything was pushed.
- [ ] On refusal: both guards checked, then one `git reset --hard HEAD~1`; on a failed guard, nothing changed at all.
- [ ] Declined-edits log read before editing; after a refusal, one record per undone edit, committed alone.
- [ ] Project skills used in the session checked; every session decision found in a project record or appended to the task file.
</verification>

<param-branch name="TERMINATION" value="TOTAL_STOP">
7. **TOTAL STOP**
   - Report in one line whether the reflection ran, what it changed, under which commit, and whether that commit was pushed. Then stop.
</param-branch>

<param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
7. **Hand off to the next phase**
   - Report in one line whether the reflection ran, what it changed, under which commit, and whether that commit was pushed.
   - Announce: "Reflection complete; entering the next phase of the composite workflow."
   - Do NOT issue a TOTAL STOP, and do NOT wait for the user to tell you to carry on. Continue immediately into the next phase, in this same turn.
   - **This is the step this atom exists to protect.** A reflection closes with a report, and a report reads like an ending — that is exactly how the phase after this one gets lost. Measured 2026-08-17: the calling workflow's Push Phase never ran, the commit stayed local, and the last thing written was the reflection report.
   - A declined push does not stop the hand-off either. You undo the commit and the edits, and the next phase runs anyway.
</param-branch>
