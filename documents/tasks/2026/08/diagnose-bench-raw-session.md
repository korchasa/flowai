---
date: 2026-08-21
status: done
implements:
  - FR-DIAGNOSE-BENCH
tags: [diagnose-benchmark-failure, acceptance-tests, raw-session, interview]
related_tasks:
  - 2026/08/agents-rules-nest-three-red.md
  - 2026/09/merge-branch-swe-bench-rescue.md
---

# Teach the shipped diagnosis skill to read the raw session and interview the agent [ANC:task:2026-08-diagnose-bench-raw-session]

## Goal

`diagnose-benchmark-failure` is the skill flowai ships for exactly one job:
find out why a benchmark failed before anyone edits a SKILL.md. It reads the
judge's rendering and stops there. Two evidence sources that repeatedly decided
real diagnoses in this repo are absent from it — the raw agent transcript, and
the failed agent itself. Users of the framework get the weaker procedure.

## Overview

### Context

Both gaps were paid for in this repo, twice each.

The raw transcript: on 2026-08-10 two `parallel_delegation` scenarios were
diagnosed for two rounds as "the harness exposes no subagent tool", on the
strength of the agent's own claim quoted in `judge-evidence.md`. The raw
sessions showed `Task` invoked in the runs that passed and absent in the runs
that failed — the capability was there and the agent's assertion was false. A
tool-call count separates "cannot" from "did not" in one command; the judge's
prose never will.

The interview: on 2026-08-21 `agents-rules-stop-analysis` took four fixes.
Three rounds of sharpening a prohibition moved the score from 0/3 to 0/3.
Resuming each failed sandbox session and asking it neutrally why it chose what
it chose pointed all three runs at the same sentence in one round — a carve-out
added as a guard that had become the escape hatch. The next fix was green.

Both lessons are already recorded for this repo (`AGENTS.md` §Diagnosing
Failures, and the dev skill `root-cause-and-fix`). Neither reached the product.

### Current State

`framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`, 239 lines.
Rule 1 names three evidence sources — `judge-evidence.md`, the sandbox
`SKILL.md`, the scenario `mod.ts` — and the word `jsonl` does not appear in the
file. Step 2 extracts tool calls from `judge-evidence.md`'s rendered
`## Tool: <name>` lines, which is the judge's rendering, not the trace.

One execution scenario exists (`md-prior-bullets`) plus the three trigger
scenarios. The execution scenario stages a failed run under `benchmarks/runs/`
and the scenario source under `.../benchmarks/<scenario>/mod.ts`; the repo has
since moved both to `acceptance-tests/`. Step 1 of the skill already says
`acceptance-tests/runs/latest/`, while step 3 still greps for
`*/benchmarks/<scenario>/mod.ts` — the file contradicts itself.

### Constraints

- Acceptance Test TDD: the scenario is written and run RED before the SKILL.md
  is touched.
- The interview step cannot be executed inside a sandbox (it needs a resumable
  session and live auth), so what is tested is that the report NAMES it as the
  next evidence step when the proposed fix is a wording change. This is stated
  in the scenario file rather than left implicit.
- Both new capabilities share one execution path over one fixture, so they get
  ONE scenario, per the near-duplicate rule in AGENTS.md.
- Report-only: the skill must still edit nothing.

### Affected Surface

Scout report (`surface-scout`, dispatched 2026-09-09 with the request text and the task path, collected verbatim):

```
## Surface

- `framework/engineering/skills/diagnose-benchmark-failure/SKILL.md` (239 lines) — primary edit target named by the task: rule 1's evidence-source list, step 2's "extract tool calls from `judge-evidence.md`" language, step 3's stale `benchmarks/` path, and the missing "raw transcript beats rendering" conflict rule and interview step — task file `documents/tasks/2026/08/diagnose-bench-raw-session.md` lines 45–56, 93–101.
- `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/raw-session/mod.ts` and its `fixture/` tree — already authored and committed (`git log`: commit `f50de05e`, "stage a run where the transcript contradicts the judge"; 110 lines, checklist items `read_raw_session`, `rejects_judge_claim`, `classification_follows_transcript`, `names_interview_step`). RED phase of the DoD appears already done; running it (and confirming it is still RED against the current SKILL.md) and iterating to GREEN is the remaining surface.
- `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/md-prior-bullets/` — sibling execution scenario, sole other one besides the trigger triplet; still stages its fixture under a `benchmarks/` path layout (`fixture/benchmarks/runs/2026-04-29T23-49-13`), the same stale convention the task asks to fix in the SKILL.md text. Not touched by the DoD, but worth checking it doesn't silently rely on the same stale grep the SKILL.md step 3 currently uses.
- `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/trigger-pos-1/`, `trigger-adj-1/`, `trigger-false-1/mod.ts` — the mandatory trigger triplet (FR-ACCEPT.TRIGGER). A SKILL.md description/body rewrite risks regressing trigger routing; these are the tests that would catch it and must stay green through the change.
- `documents/requirements.md:1719–1729`, section `FR-DIAGNOSE-BENCH` — the SRS entry for this exact skill. Its "Description" says the skill reads "the run artifacts (`judge-evidence.md`, sandbox `SKILL.md`, `mod.ts`)" and its "Constraints" say "Fail-closed: if any of the **three** required artifacts is missing" — both go stale the moment the raw `.jsonl` becomes a required fourth source. `**Acceptance verified by acceptance tests:**` currently lists only `diagnose-benchmark-failure-md-prior-bullets`; the new `diagnose-benchmark-failure-raw-session` scenario belongs there once green.
- `documents/requirements.md:594` (FR-ACCEPT section, "Known gaps") — explicitly names `diagnose-benchmark-failure-raw-session` as "retired to `documents/tasks/2026/08/diagnose-bench-raw-session.md`". This line must be updated once the scenario is GREEN and the task closes, or it will contradict the task's own DoD state.
- `documents/tasks/2026/08/diagnose-bench-raw-session.md` frontmatter (`status: to do`) — must flip per the auto-derivation rule in `AGENTS.md` (`## Definition of Done` all `[x]` → `done`) once all four DoD items are checked.
- `documents/tasks/2026/08/agents-rules-nest-three-red.md` (`related_tasks` link) — companion task; not edited, but its "Fourth red" narrative and raw-session/interview evidence are the origin story this task's fixture recreates. Cross-check its content is not itself invalidated.
- `.claude/skills/root-cause-and-fix/SKILL.md` and `.agents/skills/root-cause-and-fix` — the DEV-side skill that already embodies "raw session over any rendering" (Rule 1) and the interview step; it is the reference implementation the task explicitly says should finally "reach the product." Any wording lifted for the shipped skill likely originates here; the two must stay consistent in spirit even though one is dev-only and one is shipped.
- `documents/tasks/2026/08/full-sweep-2026-08-28-reds.md` and `documents/tasks/2026/09/sweep-reds-follow-up.md` — other task files that mention `diagnose-benchmark-failure` and the raw-session scenario in sweep bookkeeping; check they don't need a status update once this scenario turns green.
- `README.md:289` — one-line catalog entry ("diagnose a failed flowai benchmark from its run artifacts"); could go stale if the skill's evidence-source count/behavior changes materially, per the Documentation Map rule for `framework/<pack>/skills/<name>/SKILL.md` → README §Packs.
- `documents/design.md:91` — lists `diagnose-benchmark-failure` among engineering-pack skills; no behavioral detail to update, but is the mapped SDS location per the Documentation Map.
- `scripts/check-trigger-coverage.ts` — validates the trigger-triplet naming/shape for every skill; the new `raw-session/` directory is a non-trigger scenario dir (mirrors `md-prior-bullets/`) and should not be flagged, but is a consumer of this skill's `acceptance-tests/` directory structure and worth a sanity check after adding files.
- `acceptance-tests/cache/engineering/diagnose-benchmark-failure-*` (existing cache entries for `trigger-pos-1`, `trigger-adj-1`, `trigger-false-1`, `md-prior-bullets`) — consumers/producers of this primitive's cache; a SKILL.md edit invalidates the cache key for every one of these scenarios (FR-ACCEPT-CACHE), so a `-n 3` re-run and full sweep will need fresh cache writes, not stale hits.
- `.claude/worktrees/context-1a8616/` and `.claude/worktrees/plain-language-w3c-coga-ai-2534d9/` — two stale worktrees that already carry a copy of `diagnose-benchmark-failure/SKILL.md` and its acceptance-tests at older commits (`4a7ae064`, `13ebe4e1`, both detached, both behind `main`'s `4fa86574`). Not part of the task's DoD, but a source of edit-target confusion if the work is accidentally done inside one of them instead of the main tree — verified they are separate git worktrees, not affected by editing the main tree's files.
- `CHANGELOG.md` — auto-generated release log already carries two prior entries for this primitive (`f50de05` RED-phase commit, `ea092bd` original skill add); a future `chore(release)` will append the GREEN-phase commit automatically. Not affected — not a manual-edit target — confirmed it's conventional-commits-generated.

## Queries used

- Read `documents/tasks/2026/08/diagnose-bench-raw-session.md` in full.
- `ls` repo root, `framework/engineering/skills/diagnose-benchmark-failure/`, its `acceptance-tests/`.
- `cat SKILL.md` of `diagnose-benchmark-failure`.
- `grep -rn "FR-ACCEPT.RULES"` and `"FR-HOWTO"` in `documents/requirements.md`.
- `cat documents/tasks/2026/08/agents-rules-nest-three-red.md` (related task).
- `grep -rln "diagnose-benchmark-failure"` across the whole repo (excluding nothing, then filtering).
- `find` for `root-cause-and-fix`; `grep` for `diagnose-benchmark-failure` in `framework/composites.yaml`, `framework/engineering/pack.yaml`.
- `cat` head of `acceptance-tests/raw-session/mod.ts`; `git log --oneline -- .../raw-session/`; `git status --porcelain` on the skill dir; `git worktree list`.
- `ls acceptance-tests/cache/engineering/ | grep raw-session`; `grep -n "diagnose-benchmark-failure" documents/design.md`.
- `grep -n "3.8\|Component Coverage Matrix"` and `grep -n "diagnose-benchmark-failure"` in `documents/requirements.md` for `FR-DIAGNOSE-BENCH`.
- `grep -n "diagnose-benchmark-failure\|FR-DIAGNOSE-BENCH"` in `documents/design.md`, `README.md`, `CHANGELOG.md`.
- `grep -n "jsonl\|\.claude/projects\|bench-home"` in the skill's `SKILL.md`.
- `find`/`cat` head of `.claude/skills/root-cause-and-fix/SKILL.md`.

## Not examined (budget)

- Did not open the full `acceptance-tests/raw-session/fixture/` tree contents (the staged `.jsonl`, `judge-evidence.md`, sandbox `SKILL.md` copy) byte-for-byte to confirm the fixture matches every DoD claim — only confirmed the files exist and read the scenario docstring.
- Did not run `deno task acceptance-tests -f diagnose-benchmark-failure-raw-session -n 1` to independently reconfirm the RED verdict.
- Did not inspect `scripts/acceptance-tests/lib/cache.ts` cache-key algorithm in detail to confirm exactly which inputs a SKILL.md text edit invalidates.
- Did not diff the two stale worktrees' copies of this skill against `main` line-by-line — only confirmed their existence and commit hashes.
- Did not check `documents/tasks/2026/09/sweep-reds-follow-up.md` and `full-sweep-2026-08-28-reds.md` in full for exact wording that would need updating — only confirmed they mention the primitive.

## Could not rule out

- Whether `documents/requirements.md:594`'s "Known gaps" sentence needs a companion edit in `documents/tasks/2026/09/sweep-reds-follow-up.md` or `full-sweep-2026-08-28-reds.md` — the cross-links weren't fully traced.
- Whether the `md-prior-bullets` fixture's own stale `benchmarks/` path layout is dormant (never exercised by the current SKILL.md step 3 in practice) or would actually break if step 3's grep pattern changes to `acceptance-tests/` — not traced through the skill's actual runtime behavior.
```

Dispositions (union of the scout's rows and the planner's own pass; updated to the selected variant in the Solution step):

- `framework/engineering/skills/diagnose-benchmark-failure/SKILL.md` — covered-by DoD items 2, 3, 4 (Solution step 3)
- `acceptance-tests/raw-session/mod.ts` + `fixture/` — covered-by DoD item 1 (Solution steps 1–2: the RED run; `setup()` gains a baseline commit, the follow-up recorded in `2026/09/merge-branch-swe-bench-rescue.md`)
- `acceptance-tests/md-prior-bullets/` (fixture staged under `benchmarks/`, checklist item `read_scenario_mod` names a `benchmarks/` path) — covered-by DoD item 4 (Solution step 4: fixture migrated to the `acceptance-tests/` layout and re-measured)
- trigger triplet `trigger-pos-1` / `trigger-adj-1` / `trigger-false-1` — covered-by Solution step 5: the `description` line gains the transcript as a fourth source (+29 characters; the open task `2026/09/skill-description-length-cap.md` has no agreed cap yet), so the triplet is re-run in this session at `-n 1`, not deferred to the hand-off
- `documents/requirements.md` `FR-DIAGNOSE-BENCH` (three-source description, fail-closed constraint, acceptance list) — covered-by DoD item 5
- `documents/requirements.md:594` known-gaps sentence naming `diagnose-benchmark-failure-raw-session` — covered-by DoD item 5
- this task file's `status:` — covered-by the commit phase's task-status auto-flip (FR-DOC-TASK-LIFECYCLE)
- `documents/tasks/2026/08/agents-rules-nest-three-red.md` — not affected — `status: done`, a permanent record; no line in it states the outcome this task delivers (frontmatter read 2026-09-09)
- `.claude/skills/root-cause-and-fix/SKILL.md`, `.agents/skills/root-cause-and-fix/` — not affected — dev-only resources, not distributed (AGENTS.md §Architecture: `.claude/skills/` is dev-only); wording is a reference, no edit
- `documents/tasks/2026/08/full-sweep-2026-08-28-reds.md`, `documents/tasks/2026/09/sweep-reds-follow-up.md` — not affected — task files are permanent records (AGENTS.md §Documentation Rules: `Evidence:` lines are not rewritten after the fact); both say the scenario is "retired to" this task, which stays true
- `README.md:289` — covered-by DoD item 5 (checked at doc sync; "from its run artifacts" remains true when a fourth artifact is added, so the expected outcome is `no change`)
- `documents/design.md:91` — not affected — inventory list of skill names with no behavioural text (`documents/design.md:85-95`)
- `scripts/check-trigger-coverage.ts` — not affected — `raw-session/` has been in the tree since `f50de05e` (2026-09-02) and `deno task check` has been green through releases 0.14.4 and 0.14.5 cut after it
- `acceptance-tests/cache/engineering/diagnose-benchmark-failure-*` — covered-by Solution step 5 (fresh cache writes come from the re-measure and the sweep)
- `.claude/worktrees/context-1a8616/`, `.claude/worktrees/plain-language-w3c-coga-ai-2534d9/` — not affected — separate worktrees (`git worktree list`); all edits happen in the main tree
- `CHANGELOG.md` — not affected — generated by the release job in `.github/workflows/ci.yml`
- `AGENTS.md` §Diagnosing Failures (source of the raw-session and interview wording) — not affected — the shipped skill is written IDE-generic from it; no edit to AGENTS.md

## Definition of Done

- [x] FR-DIAGNOSE-BENCH: a scenario stages a failed run whose `judge-evidence.md`
      asserts a capability was unavailable while the raw transcript shows the
      tool was invoked, and it fails on the current SKILL.md.
  - Test: `Benchmark: diagnose-benchmark-failure-raw-session`
  - Evidence: `deno task acceptance-tests -f diagnose-benchmark-failure-raw-session -n 1`
    scores below threshold with the transcript unread. RED recorded 2026-09-09:
    `acceptance-tests/runs/2026-09-09T01-29-58/diagnose-benchmark-failure-raw-session/run-1/`,
    `Result: FAILED (Errors: 5, Warnings: 0)` — `read_raw_session`,
    `cites_tool_calls_from_transcript`, `rejects_judge_claim`,
    `classification_follows_transcript`, `names_interview_step` red;
    `no_files_edited` green (the setup commit of step 1 works)
- [x] FR-DIAGNOSE-BENCH: the skill reads the raw `.jsonl` transcript as a required
      evidence source and prefers it over the judge's rendering on conflict.
  - Test: `Benchmark: diagnose-benchmark-failure-raw-session`, checklist items
    `read_raw_session`, `cites_tool_calls_from_transcript`, `rejects_judge_claim`,
    `classification_follows_transcript`
  - Evidence: `deno task acceptance-tests -f diagnose-benchmark-failure-raw-session -n 3`
    passes 2/3 or better. Measured 2026-09-09: 3/3 PASSED,
    `acceptance-tests/runs/2026-09-09T01-32-43/`; every run ran `jq` against the
    `.jsonl` and classified `CAPABILITY-CLAIMED-UNAVAILABLE` as the agent's own
    choice, not a harness limit
- [x] FR-DIAGNOSE-BENCH: when the proposed fix is a wording change, the report
      names resuming the failed session and asking it why, with the command.
  - Test: `Benchmark: diagnose-benchmark-failure-raw-session`, checklist item
    `names_interview_step` (tightened in step 2 to require a resume command,
    not just a described procedure)
  - Evidence: same `-n 3` run — `names_interview_step` green 3/3, each report
    carrying a `claude -p --resume 9c41be07-…` command (run 2 appended the
    `.jsonl` extension to the uuid; the wording now says "without its
    extension")
- [x] FR-DIAGNOSE-BENCH: the skill's own paths agree — `acceptance-tests/`, not
      `benchmarks/` — and the sibling scenario stays green on the new layout,
      with a codex-layout transcript in its fixture so the four-artifact rule holds.
  - Test: `grep -c "benchmarks/" framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`
    prints 0; `Benchmark: diagnose-benchmark-failure-md-prior-bullets`;
    `Benchmark: diagnose-benchmark-failure-trigger-pos-1`, `-trigger-adj-1`, `-trigger-false-1`
  - Evidence: `deno task acceptance-tests -f diagnose-benchmark-failure-md-prior-bullets -n 1`
    passes; `deno task acceptance-tests -f diagnose-benchmark-failure-trigger -n 1` passes 3/3.
    Measured 2026-09-09: grep prints 0; md-prior-bullets PASSED 1/1 (cache
    written); trigger-pos-1 / adj-1 / false-1 PASSED 3/3
- [x] FR-DIAGNOSE-BENCH: SRS section `FR-DIAGNOSE-BENCH` names the raw transcript
      as the fourth required artifact, lists `diagnose-benchmark-failure-raw-session`
      under acceptance, and the known-gaps sentence in `FR-ACCEPT` no longer
      calls the scenario retired.
  - Test: `deno run -A scripts/check-fr-coverage.ts FR-DIAGNOSE-BENCH`
  - Evidence: `grep -n "raw-session\|four required artifacts\|CAPABILITY-CLAIMED-UNAVAILABLE\|raw agent transcript" documents/requirements.md`
    shows the acceptance line, the fail-closed line, the taxonomy code, the
    Description and the Evidence-grounded line, and no "retired" wording;
    `deno task check` green. Measured 2026-09-09: the grep hits lines 594, 1721,
    1722, 1726, 1728, 1730 and no "retired"; `check-fr-coverage FR-DIAGNOSE-BENCH`
    → COVERED (both scenarios cached on codex); `deno task check` exit 0
    (792 + 187 passed, 0 failed)

## Solution

Selected variant: B — full scope, no new code.

1. **Fixture baseline commit** — `acceptance-tests/raw-session/mod.ts` `setup()`:
   after the two `copy()` calls, run `git add -A` + `git commit -m "staged failed run"`
   via `runGit` from `@acceptance-tests/utils.ts`, the way the `adapt`
   scenarios do (`framework/core/commands/adapt/acceptance-tests/*/mod.ts`), so the judge never reads the fixture as agent edits under
   `no_files_edited`.
2. **RED** — first tighten `names_interview_step` so a described procedure
   without a resume command fails (DoD 3 says "with the command"); then
   `deno task acceptance-tests -f diagnose-benchmark-failure-raw-session -n 1`.
   Expected: `read_raw_session` and `names_interview_step` fail (the 2026-09-02
   sweep run shows the agent never opened the `.jsonl` and invented a taxonomy
   code). Record the verdict in DoD item 1.
3. **GREEN — `SKILL.md`** (`framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`,
   standalone skill, not a composite target):
   - Rule 1 and the frontmatter `description` (it lists the sources it reads,
     so it IS edited — hence the trigger re-run in step 5): four evidence
     sources — add the raw agent transcript. Rule 3: the transcript is a
     citable source. Rule 4 (fail closed): four artifacts; a missing transcript
     stops the skill with the two paths searched.
   - New rule: on any conflict between `judge-evidence.md` and the transcript,
     the transcript wins; a capability claim in the agent's prose ("no subagent
     tool here") is a hypothesis to test against the tool-call count, never a
     finding.
   - New step after step 2: locate the transcript under
     `<run-dir>/bench-home/` (codex rollout under `.codex/sessions/…/rollout-*.jsonl`,
     judge rollouts under `.codex-judge/` excluded; claude under
     `.claude/projects/<slug>/<uuid>.jsonl`), print the tool-call histogram with
     the two `jq` one-liners from AGENTS.md §Diagnosing Failures, and quote the
     agent's own reasoning lines around the decisive call.
   - Step 3: path `framework/<pack>/{skills,commands,agents}/<primitive>/acceptance-tests/<scenario>/mod.ts`
     and the matching `find`.
   - New step after classification: when the proposed next iteration is a
     wording change to the primitive, the report MUST name the interview as the
     next evidence step, with the resume command for the run's IDE (from
     AGENTS.md, IDE-generic phrasing, neutral question template), and say it is
     to be run for every failed run.
   - Taxonomy: add `CAPABILITY-CLAIMED-UNAVAILABLE` — symptom: agent prose says a
     tool or capability was missing; transcript shows it invoked or installed;
     cause: the agent abandoned the approach and explained it as an environment
     limit; fix-direction: close the clause in the primitive that licensed the
     fallback, after the interview.
   - Output template: `Evidence collected` gains the transcript line with its
     histogram; `Proposed next iteration` gains `Interview:` line.
4. **Sibling fixture** — move
   `acceptance-tests/md-prior-bullets/fixture/benchmarks/runs/…` to
   `fixture/acceptance-tests/runs/…`, and
   `fixture/framework/engineering/skills/conduct-qa-session/benchmarks/multi-select-format/`
   to `…/acceptance-tests/multi-select-format/`; update `setup()` copy target and
   the `read_scenario_mod` checklist text; add the same baseline commit as in
   step 1. Add a codex-layout transcript to the fixture
   (`run-1/bench-home/.codex/sessions/2026/04/29/rollout-<ts>-<uuid>.jsonl`, a
   short rollout whose tool calls agree with the fixture's `judge-evidence.md`),
   so the four-artifact rule is satisfiable and the codex branch of step 3 is
   exercised by a scenario. Fix the two checklist items that name paths absent
   from the fixture: `read_judge_evidence` and `read_sandbox_skill` name
   `runs/latest/` and `.codex/skills/`, the fixture has neither — `setup()`
   creates the `acceptance-tests/runs/latest` symlink in both scenarios, and the
   sandbox path in the item becomes `.claude/skills/`. Re-measure `-n 1`.
5. **Measure** — `raw-session -n 3` (2/3 or better) and
   `deno task acceptance-tests -f diagnose-benchmark-failure-trigger -n 1`
   (3/3, the description changed; `-f` is a substring match on the scenario id,
   `scripts/acceptance-tests/lib/acceptance_discovery.ts:106`). Then hand off
   `deno task acceptance-tests -f diagnose-benchmark-failure` (trigger triplet +
   both execution scenarios) to the user.
6. **Docs** — SRS `FR-DIAGNOSE-BENCH`: description lists four artifacts, the
   taxonomy list gains the new code, the Evidence-grounded constraint cites
   four sources, fail-closed says four, acceptance line adds
   `diagnose-benchmark-failure-raw-session`; `FR-ACCEPT` known-gaps sentence
   (`requirements.md:594`) drops the "retired" clause. README §Packs line checked.
   `deno task check` green.

Error handling: the skill stays report-only and fail-closed: a missing
transcript stops the diagnosis and the report names the gap with the two paths
searched, the same way a missing `judge-evidence.md` does today. No code changes outside the two scenario `setup()` functions.

## Plan Review

`plan-critic` raised 2 blocking and 6 advisory objections; disposition:

- applied — fail-closed on four vs. transcript-less sibling fixture (Solution step 4 adds a codex rollout to the `md-prior-bullets` fixture).
- applied — description IS edited; trigger triplet re-run in this session (step 5, DoD 4).
- applied — codex layout now exercised through the sibling fixture (step 4).
- applied — `read_judge_evidence` / `read_sandbox_skill` paths aligned with the fixture via a `latest` symlink and `.claude/skills/` (step 4).
- kept with justification — the `CAPABILITY-CLAIMED-UNAVAILABLE` taxonomy code: it names the class the transcript rule exists for (verified 2026-08-10 on `parallel_delegation`); checked by `classification_follows_transcript` and by the DoD 5 grep.
- applied — Evidence-grounded constraint in SRS cites four sources (step 6, DoD 5 grep).
- applied — `names_interview_step` requires the command (step 2, DoD 3).
- applied — wording fixed to `adapt` scenarios; `-f` substring semantics cited.

