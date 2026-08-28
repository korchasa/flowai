---
name: root-cause-and-fix
description: Autonomous investigate → root-cause → fix → verify loop for this repo's own defects. Decides first whether the product or the measuring instrument is broken, fixes that layer, proves it with the test that would have caught it, and writes what it learned back into itself. Use when a scenario, check or benchmark fails and the cause is not known.
---

# Root-Cause And Fix

## Overview

Dev-only loop for the flowai repo. A red test is a claim about the world, not a
fact about the product: the harness may have lost the evidence, the checklist may
test yesterday's framework, or the scenario may never have supplied what it
demands. Measured splits of instrument to product: 7:1 on 2026-08-20, 1:3 on
2026-08-21, 5:5 on 2026-08-22. Decide the layer first, fix second.

**Autonomy contract**: invoking this skill IS authorization for the whole loop —
reading sandboxes, running single scenarios, editing the layer the diagnosis
points at, re-measuring, and committing on a non-`main` branch. Do NOT pause to
ask which hypothesis to test or whether a run may be started; the audit trail is
the Hypothesis Board plus the evidence quoted in each finding. Hand back only on
a hard blocker — a guard fires (`system_health`, `process_watchdog`, a
pre-commit hook), the environment is missing (auth, Docker, disk), or the second
fix attempt for one failure fails — then emit a STOP-ANALYSIS REPORT.

## Rules

1. **Raw session over any rendering.** `judge-evidence.md` and `report.html` are
   the judge's rendering; ground truth is the transcript the CLI wrote for itself
   plus the sandbox on disk. Renderings also reorder: a `report.html` verdict
   block is NOT the run directory of the same index. Absence in a rendering is
   not absence in the world — every "the agent never X" claim comes from a
   tool-call count or a session line, never from a summary.
2. **Guards are signals.** A guard that blocks the run means conditions are
   wrong. Never reach for `--force`, `--no-verify` or an override env var; report
   the blocker instead.
3. **Fix the layer the cause is in.** Product defect → the primitive. Instrument
   defect → `scripts/acceptance-tests/lib/`. Stale contract → the scenario. Never
   quiet a red test by editing whichever of the three is easiest to reach.
4. **Never flip a checklist into its opposite.** Rewriting "must have X" as "must
   NOT have X" trades one red for another and hides that the requirement was
   conditional. Scope the item to what it tests and record every dead version.
5. **No test-fitting.** Do not hint the answer in `userQuery`, do not script the
   persona, do not pre-create what the skill should produce. Change a query only
   because it was malformed, and say so in the file.
6. **Correct the record where the wrong claim lives.** A comment that encoded a
   wrong diagnosis costs the next reader a whole investigation — rewrite it in
   place with what the evidence shows, and keep the retracted version visible.
7. **Distinguish variance from regression.** A real defect fails the same way
   three runs in a row; one sweep disagreeing with the next on an unchanged tree
   is load noise. Re-measure — but name the mechanism before settling on noise,
   because a flake with a mechanism is a defect that load merely uncovers.
8. **This file is an output of the loop.** Rules 4 and 6 apply to it too: a
   signature that proves wrong gets corrected in place, and what the loop learns
   gets written back (Phase 6). A lesson left in chat is lost.

## Phase 0 — Instrument or product

Run this BEFORE anything else. Each signature below was paid for once.

- **Exit 1, empty trace, ~10-20 s.** `OAuth session expired`, `Invalid API key`,
  `Usage credits required`: source `.env` before the sweep. `detectAuthFailure`
  throws only at zero tool calls — a scenario driving another IDE's CLI surfaces
  THAT child's auth error, a true observation.
- **Exit 124 with tool calls present.** A global timeout, and since 2026-08-22 a
  warning rather than a blocker when the trace is non-empty. Ask whether the work
  legitimately outlives the cap — `deep-research` does.
- **The judge says something is missing or wrong and the disk says otherwise.**
  It only ever saw the evidence blob, so ask what that blob contained. Two known
  holes: a file over 30 KB is elided mid-file (`renderFileForEvidence`), and until
  2026-08-25 the evidence carried only `git diff <init>..HEAD` — so a workflow
  that stops to ask before committing had its whole product invisible, and the
  SETUP's own commit read as the agent's last word. That is how
  `adapt-skills-basic` failed `adapted_to_python` with `poetry run pytest` sitting
  in the file. Both are fixed; check the disk before believing the judge anyway.
- **The cache file is not the run.** `acceptance-tests/cache/<pack>/<id>/<ide>.json`
  holds the last RECORDED verdict, often an older green one, and it contradicts
  the `report.html` you are diagnosing without saying so. Take per-item verdicts
  from the run — `✗ <item>` lines in `report.html` — never from the cache.
- **Adjacent-negative fails, correct neighbour lives in another pack.** The
  runner mounts `core` plus the scenario's pack, so there was nothing to defer to.
  Set `extraPacks` (FR-ACCEPT.TRIGGER).
- **Checklist demands an artefact the primitive's own text forbids.** Read the
  SKILL.md first: `init` forbids wrapper scripts when the project's runner
  suffices, while its checklist demanded `scripts/check.ts`.
- **The red scenario is untracked.** `git ls-files` does not list it: another
  session's deliberate RED in a shared tree, not your regression. Never fix it.
- **A verdict that changed with no tree change.** Load noise — then ask what the
  load EXPOSED, because re-measuring hides a deterministic cause as readily as it
  clears a false one. On 2026-08-24 the watchdog's rss test had been dismissed as
  noise for months; the buffer it measured was compressed away by the OS in under
  a second, and every green re-run was a poll landing inside that window.
- **The turn ends while a dispatched subagent is still running.** The ACP loop
  runs only while the emulator answers, so the result is never collected and the
  summary never happens (`maintenance-basic` died at 228 s where siblings ran
  950 s). The cure is in the primitive: "wait for all subagents" has to say that
  waiting means COLLECTING, and that nothing is presented while one is
  outstanding.
- **The fixture is not what the scenario thinks it is.** `git show <init-sha>:<file>`
  in the sandbox is the exact input. `setup()` runs AFTER that commit, so whatever
  it plants is an UNCOMMITTED change in the agent's own diff: on 2026-08-23 the
  judge read an injected hierarchy as a line the agent had WRITTEN and failed the
  item asking whether it had READ it — planted pre-existing state must be
  committed. The fixture must also pass every deterministic checker (`deno fmt
  --check`, `lint`, `test`, the Benchmark Fixture `deno.json`) or the agent stops
  on THAT and never reaches the planted defect — three of ten scenarios on
  2026-08-22, and `audit-clean` passed while `audit.ts` found 8 issues in the
  input its checklist calls clean.
- **Exit 144, no verdict, a `[fork-loop guard]` line.** The guard aimed at the
  BENCH (fixed by `adoptablePgid`), or at a legitimate shell pipeline (fixed by
  raising `maxDescendants` to 16 on 2026-08-25).
- **The agent stopped instead of working (often zero tool calls, exit 0).** Read
  the turn status: `review_ready` means it produced the artefact unaided;
  `blocked` means it stopped for material the query never supplied — a malformed
  scenario, not a routing miss. If the scenario carries a `userPersona`, check
  `interactive`: `UserEmulator` is built only when that flag is true
  (`runner.ts`), so the persona is dead text and the scenario is green only while
  the skill skips asking.
- **A `mocks` entry does not stand in for the whole pipeline.** `writeMockBin`
  shadows the binary on `PATH`, so the canned text is the next pipe stage's
  INPUT. A mock holding already-parsed output passes only while the agent skips
  the documented pipe; the comment above it may still describe the retired hook.
- **Every judge call fails, or a probe hangs into `aborted_streaming`.** Read
  the agent's own text before blaming the CLI or its flags: `API Error: 529
  Overloaded` sits there in plain words, and on 2026-08-24 it cost half an hour
  of bisecting `--json-schema`. `grep -l "API Error: 5"` over a sweep bounds it.
- **A scenario at 2/3 passes the threshold and can still hold a real defect.**
  Read the failing run. Two did on 2026-08-22, both product defects.
- **The rule was in the file and still did not fire.** First prove the text
  reached the agent — a green sibling sharing the artefact does it in one line.
  Then read the session for the shape. Never mentions it → never bound; bind it
  AHEAD of the decision, since an agent holding a solution reads a rule for
  exemptions. Quotes and overrides it → say what compliance PRODUCES, and grep for
  a neighbouring rule claiming the case, since the weaker of two wins. Reclassifies
  the case → your own carve-out is the escape; scope it to what the user NAMED.
  Forbid the act, not the harm: a rule stated as a consequence dies by denying the
  consequence.

Print the verdict — `INSTRUMENT` or `PRODUCT` — with the evidence line that
decided it, then continue.

## Phase 1 — Evidence

Read in this order and stop as soon as the cause is unambiguous.

1. The raw session. `<run>/<scenario>/run-N/bench-home` is a SYMLINK into
   `$TMPDIR/flowai-bench/run-N-<hash>/`; `readlink` it, then `find` the
   `.claude/projects/<slug>/<uuid>.jsonl` inside. Tool histogram (add
   `and .name=="Skill"` piped to `.input` for skill calls; subagent transcripts
   sit under `<uuid>/subagents/`):
   `jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn`
2. The sandbox on disk (`readlink <run>/<scenario>/run-N/sandbox`) — what the
   agent actually wrote settles claims no transcript reading can.
3. The failed agent itself, when the diagnosis is about wording. Resume in place
   (`cd <sandbox> && HOME=<bench-home> claude -p --resume <uuid> "<question>"`)
   and ask neutrally which phrase left room. On 2026-08-21 three runs named the
   same defective sentence in one round, after three rounds of guessing had not:
   the transcript shows what it did, the interview the words it justified it by.
4. If the run dir was pruned, the transcript and the judge's per-item JSON
   survive in `report.html` — parse with python, never grep the raw HTML, and
   never `Read` a `.jsonl` (104 000 tokens for 44 lines).
5. The scenario file: what it asserts, and whether the query supplies what it
   demands. Then the primitive's own text — the atom under `framework/atoms/`,
   never the generated `SKILL.md`.

## Phase 2 — Hypotheses

Propose 3–7 candidate causes with probabilities summing to ~100, one line of
reasoning each, and print the Hypothesis Board. For the highest-probability
untested one, design an experiment with a discrete outcome — state before running
it what success and failure each prove. Execute, record, re-weight, reprint. With
several reds in hand, check each isolates a different hypothesis. Terminate at
~80 %, after three experiments that move nothing, or 5 iterations.

Diagnostic edits are reverted from `cp` backups — never with `git checkout --`
or `git restore`, which return the index rather than what you wrote.

## Phase 3 — Fix

- **Product**: edit `framework/atoms/<name>.md` (or the skill/agent file), then
  `deno run -A scripts/generate-skill-composites.ts --write`; the nine generated
  `SKILL.md` files are gitignored build artefacts (`--list-targets` names them).
- **Instrument**: edit `scripts/acceptance-tests/lib/`. Extract the decision into
  a pure exported function and unit-test it in a file `deno task check` runs, NOT
  `runner_test.ts`, which `task-check.ts` ignores.
- **Contract**: edit the scenario or its fixture, saying in the file what the old
  version held and why it was wrong.

When the layer is a RULE that did not fire, two shapes decide whether the repair
holds. Prefer precondition grammar to prohibition — "X is a precondition on Y,
not a step you may or may not enter" binds where "you are NOT done until X" does
not; two interviewed agents drew that contrast unprompted on 2026-08-25. And
elaborate a shared paragraph on ALL its triggers or none: two sentences added
about a missing VALUE made the same paragraph stop binding for a missing SCRIPT,
and a green scenario fell to 1/3 for a case I never touched.

Every fix carries, in the file it touches, the measurement that justified it:
date, runs, what the sessions showed. **Then grep the file for the NEW text —
the script's exit code is not evidence the edit landed.** On 2026-08-24 one
`replace` was computed and never applied, so the file carried a comment
describing a change that was not there and a whole measurement round paid for it.
A framework rule may not name a project's doc paths either (`FR-UNIVERSAL.DOC-SCHEMA`):
writing "do not read the default paths" while naming them fails `check-skills`.

## Phase 4 — Verify

- Single scenario, cache bypassed, in the background, `.env` sourced in the same
  shell (they do not persist): `deno task acceptance-tests -f <id> -n 3`. `-f`
  takes ONE substring, last wins; `-p` sets concurrency; the lock forbids
  concurrent runs. A foreground run past the tool's cap is killed mid-flight.
- Host preflight: load, free swap, orphaned runners (`ps -Ao pid,etime,command |
  grep -E "runtests.py|benchmark.ts run"`). Under memory pressure `system_health`
  aborts sessions and every result is noise; re-measuring an aborted column is
  cheap — on 2026-08-24 ten of eleven such failures were green on retry.
- The verdict is the run log's `--- PASS RATES ---` block, not `report.html`.
  The threshold is 2/3, so `[PASS]` covers a run that failed a critical item,
  and a section whose verdict JSON you cannot scrape is not a red — read the log.
- An instrument fix is verified by its unit test AND by the scenario it misread;
  a product fix, against the raw sessions and the sandbox. The number has to move
  for the reason claimed. **Re-measure one GREEN sibling of every primitive you
  edited** — that guard caught a scenario dropping 3/3 to 1/3 on 2026-08-24.
- Name what the green number covers: a rule phrased "if you see X" binds at every
  stage while the suite holds one, so "3/3" reads as general when it is not.
- `deno task check` before every commit. Its verdict is the final
  `N passed | M failed` line; the three `=== FAIL deno eval Deno.exit(...)` lines
  are intentional fixtures.

## Phase 5 — Record and commit

- Update the docs the change maps to (AGENTS.md Documentation Map): an instrument
  change in SDS §3.4, a trigger lesson in FR-ACCEPT.TRIGGER. When a doc records
  the behaviour you are changing as deliberate, say so and ask.
- Check `git diff --cached --stat` in a SEPARATE tool call, then commit by
  explicit paths. The tree is shared with other sessions.
- The commit message states what was wrong, what the evidence was, and what
  remains red. A fix whose measurement did not move says so.

## Phase 6 — Amend this skill

This file is the only artefact that carries a lesson into the next session.
Decide at the end of every run whether it should change and say which way — a
silent skip is indistinguishable from a forgotten step.

**Earns an edit:** a cause Phase 0 would NOT have caught, that can recur (one
bullet, dated); a rule you broke that cost real work; a signature here that
proved wrong — correct it in place, keeping the retracted claim visible; a
command, path or flag that changed under you.

**Does not earn an edit:** a one-off in one environment; a restatement of a rule
already here; a finding about the PRODUCT rather than about diagnosing it; a run
that went well.

**Budget**: 270 lines, and this is the fifth raise (240 → 250 → 255 → 260 → 270
across 2026-08-24/25). The ratchet is the failure the budget exists to prevent,
so the number stops here: the next addition DISPLACES a bullet. Compress first,
never as a fallback — two bullets on one failure shape are one bullet, and two
such merges paid for two new signatures on 2026-08-25. Commit the amendment with the work that produced it and say what was
learned, not that the skill was updated.

## Verification

<verification>
[ ] Phase 0 verdict printed — INSTRUMENT or PRODUCT — with the deciding evidence.
[ ] Raw session read before any claim about what the agent did.
[ ] Hypothesis Board printed before and after each experiment.
[ ] Diagnostic edits reverted from copies; worktree clean between experiments.
[ ] Fix landed in the layer the cause is in, with its measurement in the file, and
    a test in a file `deno task check` runs.
[ ] Scenario re-measured with `-n 3`; variance separated from regression.
[ ] `deno task check` green; commit by explicit paths after a separate index check.
[ ] Report names what is still red and why; a documented decision you had to
    overturn was raised, not resolved quietly.
[ ] Phase 6 decision stated aloud: amended, or left alone with the reason.
</verification>
