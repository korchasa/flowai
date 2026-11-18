---
date: 2026-11-10
status: done
implements:
  - FR-ATOM-REFLECT-GATE
  - FR-FINISH-SESSION
  - FR-REFLECT
  - FR-DOC-RESCUE
tags: [reflect, skills, self-improvement]
related_tasks:
  - 2026/11/session-goal-check-and-finish.md
  - 2026/08/extract-reflect-gate-atom.md
---
# Skill self-improvement inside the reflect phase

## Goal

An agent working in a flowai project improves the project's own skills without being asked: it repairs a skill that
proved wrong, writes a new skill for work that will recur, and removes a skill that is broken or duplicated. The user
keeps one decision — whether the result is published — and a declined edit does not come back in the next session.

## Overview

### Context

The user's personal instructions carry a skill lifecycle ("propose, confirm, log"), modelled on Hermes-style
self-improving agents. Its design and evidence live outside this repo, in
`~/second-brain/knowledge/AI/concepts/self-improving-agents/skill-lifecycle-rules.md`. This task turns that lifecycle
into a general flowai instruction.

Decisions taken by the user on 2026-11-10, in this order:

1. No new user-facing skill. The instruction lives in the reflect phase (`framework/atoms/reflect-gate.md`), which
   already runs at the end of four composites.
2. The write order of the reflect phase stays as it is: write the edit, commit it as `agent:`, ask whether to push,
   and on refusal remove the commit and the edits. This differs on purpose from the personal rule (confirm before
   writing).
3. A declined edit is recorded in a log kept inside the repository, and the phase reads the log before editing.
4. The standalone `reflect` skill and the standalone `reflect-gate` skill are removed. `reflect-by-history` stays.
5. Sessions that end without a review/commit chain get the phase through the `finish-session` composite.

Loads over the last 30 days, both Claude Code config roots (`python3 scripts/flowai-skill-reads.py --json`, run
2026-11-10): `review-commit-push` 193, `review-and-commit` 39, `ship` 19, `ship-task` 9 — 260 loads that carry the
reflect phase; standalone `reflect-gate` 0; `reflect` 2; `reflect-by-history` 0; `finish-session` 0.

### Current State

- `framework/atoms/reflect-gate.md` audits the session and edits "`AGENTS.md`, `**/CLAUDE.md`, and the rule/skill
  files they point at". Its audit has one line on skills ("a repeated multi-step sequence → a skill") and nothing on
  repairing or removing one. It keeps no memory of declined edits: a refusal runs `git reset --hard HEAD~1` and leaves
  no trace.
- `framework/composites.yaml` renders the atom into `review-and-commit`, `review-commit-push`, `ship`, `ship-task`,
  and into the standalone target `framework/core/skills/reflect-gate/SKILL.md` (3 trigger scenarios).
- `framework/core/skills/reflect/` is a hand-written, report-only skill with 10 scenarios. It is the only carrier of
  decision rescue (FR-DOC-RESCUE), and its scenario `reflect-stale-command-fact` is cited as acceptance by
  FR-ATOM-REFLECT-GATE.STALE-FACTS.
- `framework/composites/finish-session.md` (Goals → Commit → Push → Archive) states "There is no review phase and no
  reflection phase". On 2026-11-10 it is uncommitted work of a parallel session, together with
  `framework/atoms/check-goals.md` and the edit to `framework/composites.yaml`.

### Constraints

- Acceptance Test TDD: every behaviour change gets a scenario that fails on the current text first.
- The atom's `<step_by_step>` block is inlined into five composites; each rendered composite stays under
  `SKILL_MAX_LINES` (700). Measure before and after with the formula in `framework/AGENTS.md` rule 7.
- No new stop inside the phase: the push question remains the only question (a second question lost the next phase
  before — see FR-ATOM-REFLECT-GATE).
- Shipped text names no IDE-specific tool and does not spell this repo's documentation layout
  (FR-UNIVERSAL.DOC-SCHEMA).
- Do not touch `framework/composites/finish-session.md`, `framework/atoms/check-goals.md` or the `finish-session`
  entry of `framework/composites.yaml` until the parallel session's work on them is committed.
- Text that goes into a skill: change one sentence, step or section, never a whole-file rewrite; ordered steps with
  commands; no incident story, date or ticket id; nothing copied from transcripts or tool output as a rule; secrets
  redacted.

## Definition of Done

- [x] FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE: the reflect phase repairs a project skill the session proved wrong (a
  command or path in it fails, a step is missing, it contradicts the repository or another instruction file).
  - Benchmark: `review-and-commit-reflect-patches-wrong-skill` (new)
  - Result 2026-11-10: PASSED 1/1 on the previous text and 1/1 on the new one — a regression guard, the previous
    text already repaired a skill the session proved wrong.
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-patches-wrong-skill`
- [x] FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE: the phase writes a new project skill when the finished work is a
  multi-step, project-specific procedure that will recur, and names the closest existing skill instead when one
  already covers it.
  - Benchmark: `review-and-commit-reflect-writes-recurring-skill` (new)
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-writes-recurring-skill`
  - Result 2026-11-10: FAILED 4 of 5 items on the previous text, PASSED 1/1 on the new one. A first draft of the new
    text failed the same way; the interviewed agent named the "complexity signals" framing, fixed in atom step 1.
  - Full sweep 2026-11-10 (run `2026-11-10T17-12-33`): 1 run wrote an `AGENTS.md` bullet instead of a skill. After
    the skill-versus-rule wording fix: PASSED 4/4 (`-n 4 --no-cache`).
  - Sweep totals before that fix: `-f review-and-commit` 18/19, `-f review-commit-push` 4/4, `-f ship` 13/13.
- [x] FR-ATOM-REFLECT-GATE.SKILL-LIFECYCLE: the phase removes a project skill whose commands or paths no longer
  exist, unless another instruction file, hook or CI config refers to it — then it repairs it.
  - Benchmark: `review-and-commit-reflect-removes-broken-skill` (new)
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-removes-broken-skill`
  - Result 2026-11-10: PASSED 1/1 before and after — a regression guard.
- [x] FR-ATOM-REFLECT-GATE.DECLINED-LOG: a declined push leaves one log record per undone edit (file, one-line
  subject, the user's reason when given), committed by explicit path after the undo.
  - Benchmark: `review-and-commit-reflect-declined-edit-logged` (new); `ship-task-reflect-push-declined` (new
    checklist item `declined_edit_recorded`)
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-declined-edit-logged`
  - Result 2026-11-10: FAILED 2 of 5 items on the previous text (no log written), PASSED 1/1 on the new one.
- [x] FR-ATOM-REFLECT-GATE.DECLINED-LOG: an edit already recorded as declined is not applied again and is named in
  the phase report as skipped, unless the file changed since the refusal.
  - Benchmark: `review-and-commit-reflect-skips-declined-edit` (new; fixture ships a log record)
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-skips-declined-edit`
  - Result 2026-11-10: PASSED 1/1 before and after — a regression guard: the agent honoured a log it found in the
    repository even without the rule.
- [x] FR-FINISH-SESSION: `finish-session` runs the reflect phase after the Push Phase and before the Archive Phase,
  and the archive still happens after the push question is answered.
  - Benchmark: `finish-session-reflect-before-archive` (new)
  - Evidence: `deno task acceptance-tests -f finish-session-reflect-before-archive`
  - Result 2026-11-17, claude `claude-sonnet-5-5`: 2 of 6 items passed before the phase was added (no `agent:` commit), 6 of 6 after.
- [x] FR-REFLECT: the standalone `reflect` skill and the standalone `reflect-gate` target are gone from the build,
  and no shipped file routes the reader to either.
  - Test: `scripts/generate-skill-composites_test.ts` (an atom without a standalone target renders into composites)
  - Evidence: `deno task build-plugins && test ! -e dist/claude-plugins/plugins/flowai/skills/reflect && test ! -e dist/claude-plugins/plugins/flowai/skills/reflect-gate && test -e dist/claude-plugins/plugins/flowai/skills/reflect-by-history`
- [x] FR-DOC-RESCUE: the reflect phase checks every decision the session made (two or more weighed alternatives and
  a stated reason) against the project's records; a decision found in no task file or requirement/design document is
  written into the session's task file inside the phase's commit and named in the phase report. With no task file
  for the session, the phase reports the decision and writes nothing.
  - Benchmark: `review-and-commit-reflect-records-unsaved-decision` (new; replaces `reflect-rescues-decision-as-task`)
  - Evidence: `deno task acceptance-tests -f review-and-commit-reflect-records-unsaved-decision`
  - Result 2026-11-10: FAILED 3 of 4 items on the previous text (the decision reached only the commit message),
    PASSED 1/1 on the new one.
- [x] Documentation matches: SRS (FR-ATOM-REFLECT-GATE and its new sub-clauses with Rationale and Acceptance,
  FR-REFLECT, FR-DOC-RESCUE, FR-PACKS trigger list), SDS §3.0 inventory, README §Packs. FR-FINISH-SESSION is edited
  together with the DoD item above it.
  - Evidence: `deno task check > "$SCRATCH/check.log" 2>&1; grep -E '[0-9]+ passed \| [0-9]+ failed' "$SCRATCH/check.log"`

## Solution

1. **Baseline.** Run one existing scenario of the phase (`deno task acceptance-tests -f
   review-and-commit-auto-invoke-reflect`) to prove the runner works, and record the rendered line counts of the five
   composites.
2. **Blast radius of the removals.** List every file that names the `reflect` skill or the standalone `reflect-gate`:
   `grep -rnF -e '`reflect`' -e '/reflect' -e 'flowai:reflect' framework scripts README.md documents/requirements.md
   documents/design.md`. Expected carriers: the `reflect-by-history` description ("use reflect instead"), the atom's
   own rule 1, trigger-adj scenarios of neighbouring skills, FR-PACKS, FR-REFLECT, FR-DOC-RESCUE,
   FR-ATOM-REFLECT-GATE.STALE-FACTS.
3. **Re-home FR-DOC-RESCUE into the reflect phase** (user decision 2026-11-10: decisions must be saved when the
   session closes, and the closing phase checks it). The old carrier was read-only, looked only at the task file and
   ran at most twice in 30 days. The new check covers the decisions of the whole session and writes the missing ones:
   - audit (atom step 2): list the session's decisions and where each one is recorded;
   - apply (atom step 4): append an unrecorded decision — alternatives, choice, reason — to the session's task file,
     resolved through the `tasks` role of the project instructions. This widens atom rule 3, which today says "never
     a task file": the new wording allows exactly this append and nothing else in a task file;
   - rewrite the FR-DOC-RESCUE clause in the SRS for the new carrier and behaviour, with Rationale.
4. **RED.** Write the four new scenarios and extend `ship-task-reflect-push-declined`. Each fixture carries a project
   skill and a session history that makes the defect observable (a failing command from the skill in the transcript;
   a recurring multi-step procedure; a skill pointing at a deleted script; a log record for an edit the session would
   otherwise repeat). Run each one against the current atom and keep the failing verdicts.
5. **GREEN — atom.** Edit `framework/atoms/reflect-gate.md`:
   - step 2 (audit): replace the single "automation opportunities → a skill" clause with the skill checks — wrong,
     contradicting, overridden by the user, missing for recurring work, broken, duplicated;
   - step 3 (self-criticism): no new skill when an existing one covers the work even partly, when the steps are
     obvious or already in the instruction files, or when the work failed;
   - step 4 (apply): read the log of declined edits first and drop a finding that matches a record unless the file
     changed since; read the current skill file before editing; the text rules from Constraints; a removal deletes the
     skill directory, git history is the way back; check a new skill's name against the installed skills;
   - step 6 (refusal): after the undo, append one record per undone edit to the log and commit that file alone by
     explicit path.
   Log path: `AGENTS.declined.md` in the repository root. `.flowai/` was ruled out: `framework/atoms/review.md` uses
   it as gitignored scratch, and the log has to be committed. No bundled script — the record is one appended line, so
   the phase needs nothing but a file write.
6. **Standalone targets.** Make `target:` optional for an atom in `scripts/generate-skill-composites.ts` (unit test
   first), drop the `reflect-gate` target and its `.gitignore` line, delete `framework/core/skills/reflect-gate/` and
   `framework/core/skills/reflect/`. Re-home `reflect-stale-command-fact` onto a composite or drop its citation from
   FR-ATOM-REFLECT-GATE.STALE-FACTS, which already cites `review-and-commit-post-reflect-cleanup-commit`.
7. **finish-session.** Only after the parallel session's work is committed: add a Reflect Phase (atom `reflect-gate`,
   `TERMINATION: HAND_OFF_TO_NEXT`) between Push and Archive in `framework/composites.yaml`, add the Push → Reflect and
   Reflect → Archive gates to the wrapper, and replace the sentence "There is no review phase and no reflection
   phase". The Archive Phase's uncommitted-files check already covers a refusal that leaves the tree clean.
8. **Docs.** SRS → SDS → README, per the Documentation Map.
9. **CHECK.** `deno task check`, then hand the full sweep to the user:
   `deno task acceptance-tests -f review-and-commit`, `-f review-commit-push`, `-f ship`, `-f finish-session`.

Open point carried from the discussion: in a session whose tree holds uncommitted work the phase's refusal path stops
(its `git reset --hard` guard requires a clean tree). `finish-session` reaches the phase after its own Commit and Push
phases, so the guard holds there; a free-standing automatic run outside any composite is out of scope.

## Status

- State: done
- Needs from the operator: nothing
- Not verified: the changed chains were run on the default claude arm only, not on codex; the generated plugin
  marketplace repository was not inspected after release 0.16.0
- Branch: main; committed (`22753bfb`, `ddd257e1`, `3ce98d71`); pushed, CI green; local `main` is level with
  `origin/main` after the CI releases up to 0.16.2
- Told directly by the operator: no new user-facing skill, the instruction lives in the reflect phase; keep the
  order "edit, commit, ask whether to push", with a log of declined edits; remove the standalone `reflect` and
  `reflect-gate` skills and keep `reflect-by-history`; the automatic run outside the review and ship chains goes into
  `finish-session`; the phase appends unrecorded session decisions to the task file; the full acceptance sweep was
  authorised for this task
- Updated: 2026-11-18 14:51 EET
