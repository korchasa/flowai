---
name: root-cause-and-fix
description: Autonomous investigate → root-cause → fix → verify loop for this repo's own defects. Decides first whether the product or the measuring instrument is broken, fixes that layer, proves it with the test that would have caught it, and writes what it learned back into itself. Use when a scenario, check or benchmark fails and the cause is not known.
---

# Root-Cause And Fix

## Overview

Dev-only loop for the flowai repo. A red test is a claim about the world, not a
fact about the product: the harness may have lost the evidence, the checklist may
test yesterday's framework, or the scenario may never have supplied what it
demands. On 2026-08-20 the split was 7 instrument faults to 1 product defect; on
2026-08-21 a nest of 4 went 1 to 3. Decide the layer first, fix second.

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
   the judge's rendering; ground truth is the transcript the sandboxed CLI wrote
   for itself, plus the sandbox on disk. Read those before forming any hypothesis
   about what the agent did. Renderings also reorder: a `report.html` verdict
   block is NOT necessarily the run directory of the same index.
2. **Absence in a rendering is not absence in the world.** Every "the agent never
   X" claim must come from a tool-call count or a session line, never from not
   seeing X in a summary.
3. **Guards are signals.** A guard that blocks the run means conditions are
   wrong. Never reach for `--force`, `--no-verify` or an override env var; report
   the blocker instead.
4. **Fix the layer the cause is in.** Product defect → the primitive. Instrument
   defect → `scripts/acceptance-tests/lib/`. Stale contract → the scenario. Never
   quiet a red test by editing whichever of the three is easiest to reach.
5. **Never flip a checklist into its opposite.** Rewriting "must have X" as "must
   NOT have X" trades one red for another and hides that the requirement was
   conditional. Scope the item to what it tests, say why it does not adjudicate
   the rest, and record every dead version in the file.
6. **No test-fitting.** Do not hint the answer in `userQuery`, do not script the
   persona, do not pre-create what the skill should produce. Change a query only
   because it was malformed, and say so in the file.
7. **Correct the record where the wrong claim lives.** A comment that encoded a
   wrong diagnosis costs the next reader a whole investigation — rewrite it in
   place with what the evidence shows, and keep the retracted version visible.
8. **Distinguish variance from regression.** A real defect fails the same way
   three runs in a row; one sweep disagreeing with the next on an unchanged tree
   is load noise. Re-measure before diagnosing.
9. **This file is an output of the loop.** Rules 5 and 7 apply to it as to any
   scenario or comment: a signature that proves wrong gets corrected in place,
   and what the loop learns gets written back (Phase 6). A lesson left in chat is
   lost at the end of the session.

## Phase 0 — Instrument or product

Run this BEFORE anything else. Each signature below was paid for once.

- **Exit 1, empty trace, ~10-20 s.** Look for `OAuth session expired`,
  `Failed to authenticate`, `Invalid API key`, `Usage credits required`. The CLI
  never ran the task. Remedy: `set -a; . ./.env; set +a` before the sweep.
  `detectAuthFailure` throws on this, but only with zero tool calls — a scenario
  driving another IDE's CLI surfaces THAT child's auth error, a true observation.
- **Exit 124 with tool calls present.** A global timeout. On a checklist of only
  skill-invocation items the routing verdict is already in the trace and the
  clock is irrelevant (`shouldInjectExitCodeCheck`); on a behavioural one, ask
  whether the work outlives the cap — `deep-research` does.
- **Judge reports a section "not present" in a large file.** Files are elided in
  the middle above 30 KB (`renderFileForEvidence`); check the file on disk first.
  This scored `doc_rules_present` missing on two `init` scenarios.
- **Zero tool calls, exit 0.** Ambiguous. Read the turn status: `review_ready`
  means the model produced the artefact unaided; `blocked` means it stopped to
  ask for material the query never supplied — a malformed scenario, not a routing
  miss. Four scenarios were misdiagnosed on this in one day.
- **Adjacent-negative fails, correct neighbour lives in another pack.** The
  runner mounts `core` plus the scenario's own pack, so the agent had nothing to
  defer to. Set `extraPacks` (FR-ACCEPT.TRIGGER, cross-pack adjacency).
- **Checklist demands an artefact the primitive's own text forbids.** Read the
  SKILL.md first. `init` forbids wrapper scripts when the project's runner
  suffices, while its checklist demanded `scripts/check.ts`.
- **A verdict that changed with no tree change.** Load noise. Re-measure.
- **The rule was in the file and still did not fire.** First prove the text
  reached the agent: find an unrelated instruction from the same file obeyed in
  the same session (`NO_COLOR=1` settled it for `agents-rules-*`). Then read the
  session for the shape. Never mentions the rule → never bound by it; fix with a
  binding moment, and place it ahead of the decision, because an agent that
  already has a solution reads the rule for exemptions. Quotes it and overrides
  it → it lost an argument; say what compliance PRODUCES, and grep for a
  neighbouring rule claiming the same decision, since the weaker of two always
  wins (`Proactive Resolution`, then the `Test Rules` accuracy wording — one
  extra measure round each). Obeys it and reclassifies the case → your own
  carve-out is the escape; scope it to what the user NAMED. And a rule stated as
  a consequence is refutable by denying the consequence — forbid the act, not
  the harm.

Print the verdict — `INSTRUMENT` or `PRODUCT` — with the evidence line that
decided it, then continue.

## Phase 1 — Evidence

Read in this order and stop as soon as the cause is unambiguous.

1. The raw session. `<run>/<scenario>/run-N/bench-home` is a SYMLINK into
   `$TMPDIR/flowai-bench/run-N-<hash>/`, so resolve it with `readlink` first, then
   `find` the `.claude/projects/<slug>/<uuid>.jsonl` inside it.
   - Tool histogram:
     `jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn`
   - Same filter with `and .name=="Skill"`, piped to `.input`, for skill calls;
     subagent transcripts sit under `<uuid>/subagents/`.
2. The sandbox on disk (`readlink <run>/<scenario>/run-N/sandbox`) — what the
   agent actually wrote settles claims no transcript reading can.
3. The failed agent itself, when the diagnosis is about wording. Resume in place
   (`cd <sandbox> && HOME=<bench-home> claude -p --resume <uuid> "<question>"`)
   and ask neutrally which phrase left room and what the rule would have had to
   say. Three runs named the same defective sentence in one round on 2026-08-21,
   after three rounds of guessing had not. The transcript shows what it did; the
   interview shows the words it justified it with, and those are the ones to fix.
4. If the run dir was pruned, the transcript and the judge's per-item JSON both
   survive in `report.html` — parse with python, never grep the raw HTML, and
   never `Read` a `.jsonl` (one such read reported 104 000 tokens for 44 lines).
5. The scenario file: what it asserts, and whether the query supplies what it
   demands. Then the primitive's own text — the atom under `framework/atoms/`,
   never the generated `SKILL.md`.

## Phase 2 — Hypotheses

Propose 3–7 candidate causes with probabilities summing to ~100 and one line of
reasoning each. Print the Hypothesis Board. Then, for the highest-probability
untested one, design an experiment with a discrete outcome — state before
running it what success and failure each prove. Execute, record, re-weight,
reprint the board. When several red scenarios are in hand, check whether each
isolates a different hypothesis: one measure round then returns one verdict per
hypothesis instead of a single conflated yes-or-no.

Terminate when one hypothesis passes ~80 %, when three consecutive experiments
move nothing, or after 5 iterations.

Diagnostic edits are reverted from `cp` backups taken beforehand — never with
`git checkout --` or `git restore`, which return the index rather than what you
wrote.

## Phase 3 — Fix

- **Product**: edit `framework/atoms/<name>.md` (or the skill/agent file), then
  `deno run -A scripts/generate-skill-composites.ts --write`. Generated
  `SKILL.md` files are gitignored build artefacts.
- **Instrument**: edit `scripts/acceptance-tests/lib/`. Extract the decision into
  a pure exported function and unit-test it in a file `deno task check` actually
  runs, NOT `runner_test.ts`, which `task-check.ts` ignores.
- **Contract**: edit the scenario, saying in the file what the old version
  demanded and why it was wrong.

Every fix carries, in the file it touches, the measurement that justified it:
date, number of runs, what the sessions showed. Prose in a product file cannot
hold that, so its guard test holds it instead.

## Phase 4 — Verify

- Single scenario, cache bypassed: `deno task acceptance-tests -f <id> -n 3`.
  `-f` takes ONE substring, last wins on repeats; `-p` sets concurrency.
- Always in the background, with `.env` sourced in the same shell — a foreground
  run past the tool's cap is killed mid-flight and shells do not persist.
- Host preflight before any sweep: load, free swap, and orphaned runners
  (`ps -Ao pid,etime,command | grep -E "runtests.py|benchmark.ts run"`). Under
  memory pressure `system_health` aborts sessions and every result is noise.
- An instrument fix is verified by its unit test AND by the scenario it misread;
  a product fix, against the raw sessions and the sandbox on disk. The number
  has to move for the reason claimed.
- Name what the green number covers. A rule phrased "if you see X" binds at
  every stage, but the suite usually holds one, so "3/3" reads as general when
  it is not — say which stage, and add a scenario for the one that costs most.
- `deno task check` before every commit. Its verdict is the final
  `N passed | M failed` line; the three `=== FAIL deno eval Deno.exit(...)` lines
  are intentional fixtures.

## Phase 5 — Record and commit

- Update the docs the change maps to (AGENTS.md Documentation Map). An
  instrument change belongs in SDS §3.4; a trigger lesson in FR-ACCEPT.TRIGGER.
- Check `git diff --cached --stat` in a SEPARATE tool call, then commit by
  explicit paths. The tree is shared with other sessions.
- The commit message states what was wrong, what the evidence was, and what
  remains red. A fix whose measurement did not move says so.

## Phase 6 — Amend this skill

This file is the only artefact that carries a lesson into the next session.
Decide at the end of every run whether it should change, and say which way you
decided — a silent skip is indistinguishable from a forgotten step.

**Earns an edit:** a cause Phase 0 would NOT have caught, that can recur (one
bullet, with the date and what it cost); a rule you broke that cost real work; a
signature here that proved wrong — correct it in place and keep the retracted
claim visible; a command, path or flag that changed under you.

**Does not earn an edit:** a one-off in one environment; a restatement of a rule
already here; a finding about the PRODUCT rather than about diagnosing it (that
belongs in the SRS, the SDS or a task file); a run that went well.

**Budget**: stay under ~220 lines. When an addition would pass that, compress an
existing item instead of appending — two bullets describing one failure shape are
one bullet. Growth without pruning turns the signature list into something nobody
reads to the end. Commit the amendment with the work that produced it, staged by
explicit path, and say what was learned rather than that the skill was updated.

## Verification

<verification>
[ ] Phase 0 verdict printed — INSTRUMENT or PRODUCT — with the deciding evidence.
[ ] Raw session read before any claim about what the agent did.
[ ] Hypothesis Board printed before and after each experiment.
[ ] Diagnostic edits reverted from copies; worktree clean between experiments.
[ ] Fix landed in the layer the cause is in, with its measurement recorded in the file.
[ ] Every fix carries a test in a file `deno task check` runs.
[ ] Scenario re-measured with `-n 3`; variance separated from regression.
[ ] `deno task check` green; commit by explicit paths after a separate index check.
[ ] Report names what is still red and why.
[ ] Phase 6 decision stated aloud: amended with what was learned, or left alone
    with the reason.
</verification>
