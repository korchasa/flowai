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
   is load noise. Re-measure before diagnosing.
8. **This file is an output of the loop.** Rules 4 and 6 apply to it too: a
   signature that proves wrong gets corrected in place, and what the loop learns
   gets written back (Phase 6). A lesson left in chat is lost.

## Phase 0 — Instrument or product

Run this BEFORE anything else. Each signature below was paid for once.

- **Exit 1, empty trace, ~10-20 s.** `OAuth session expired`, `Invalid API key`,
  `Usage credits required`: the CLI never ran the task; source `.env` before the
  sweep. `detectAuthFailure` throws only at zero tool calls — a scenario driving
  another IDE's CLI surfaces THAT child's auth error, a true observation.
- **Exit 124 with tool calls present.** A global timeout, and since 2026-08-22 a
  warning rather than a blocker when the trace is non-empty. Ask whether the work
  legitimately outlives the cap — `deep-research` does.
- **Judge reports a section "not present" in a large file.** Files are elided
  mid-file above 30 KB (`renderFileForEvidence`); check disk first.
- **Zero tool calls, exit 0.** Ambiguous. Read the turn status: `review_ready`
  means the model produced the artefact unaided; `blocked` means it stopped for
  material the query never supplied — a malformed scenario, not a routing miss.
- **Adjacent-negative fails, correct neighbour lives in another pack.** The
  runner mounts `core` plus the scenario's pack, so there was nothing to defer
  to. Set `extraPacks` (FR-ACCEPT.TRIGGER, cross-pack adjacency).
- **Checklist demands an artefact the primitive's own text forbids.** Read the
  SKILL.md first: `init` forbids wrapper scripts when the project's runner
  suffices, while its checklist demanded `scripts/check.ts`.
- **A verdict that changed with no tree change.** Load noise; re-measure. One
  shape carries a mechanism: the ACP loop runs only while the emulator answers
  and stops on `<NO_RESPONSE>`, so an interactive agent that closes its turn
  waiting on background subagents ends the session early (`maintenance-basic`
  died at 228 s where siblings ran 950 s, then passed 3/3).
- **The scenario asserts something the sandbox never contained.** The runner
  commits the fixture first, so `git show HEAD:<file>` in the sandbox is the
  exact input — read it before believing "the agent missed X". Until 2026-08-22
  the rendered `AGENTS.md` overwrote a fixture's own instruction file, deleting
  seven scenarios' premise; a fixture can also speak a retired dialect its
  `mod.ts` says it left. Run any deterministic checker over it, green scenarios
  included: `audit-clean` passed while `audit.ts` found 8 issues on the fixture
  its checklist calls clean.
- **The fixture breaks a SECOND rule behind the first.** The sandbox runs the
  project's own checks against the fixture, so it must itself pass `deno fmt
  --check`, `deno lint` and `deno test`, and ship the `deno.json` from the
  Benchmark Fixture contract (AGENTS.md). Three of ten scenarios needed two
  rounds on 2026-08-22: an inline `jsr:@std/assert` raised `no-import-prefix`,
  a 98-character line failed fmt, and the agent stopped on THAT and never
  reached the planted defect. Re-measure after every fixture fix — the first
  blocker is rarely the only one.
- **Exit 144, no verdict, a `[fork-loop guard]` line naming one pgid for two
  different rootPids.** The guard aimed at the BENCH. `setpgrp_exec.py` calls
  `setsid()` after the first 500 ms tick under load, so the watchdog caches the
  bench's own group, counts sibling runs as descendants and SIGKILLs the parent.
  Only reproducible at `-p >1`; fixed 2026-08-22 by `adoptablePgid`.
- **A scenario at 2/3 passes the threshold and can still hold a real defect.**
  Read the failing run before moving on. Two did on 2026-08-22, and both were
  product defects the other two runs happened to avoid.
- **The rule was in the file and still did not fire.** First prove the text
  reached the agent: an unrelated instruction from the same file obeyed in the
  same session (`NO_COLOR=1` settled `agents-rules-*`). Then read the session for
  the shape. Never mentions it → never bound; add a binding moment AHEAD of the
  decision, since an agent holding a solution reads the rule for exemptions.
  Quotes and overrides it → it lost an argument; say what compliance PRODUCES and
  grep for a neighbouring rule claiming the case, because the weaker of two wins
  (`Proactive Resolution`, then the `Test Rules` accuracy wording — one measure
  round each). Obeys it and reclassifies the case → your own carve-out is the
  escape; scope it to what the user NAMED. A rule stated as a consequence is
  refutable by denying the consequence — forbid the act, not the harm.

Print the verdict — `INSTRUMENT` or `PRODUCT` — with the evidence line that
decided it, then continue.

## Phase 1 — Evidence

Read in this order and stop as soon as the cause is unambiguous.

1. The raw session. `<run>/<scenario>/run-N/bench-home` is a SYMLINK into
   `$TMPDIR/flowai-bench/run-N-<hash>/`; `readlink` it, then `find` the
   `.claude/projects/<slug>/<uuid>.jsonl` inside. Tool histogram:
   `jq -r 'select(.message.content|type=="array") | .message.content[] | select(.type=="tool_use") | .name' <file> | sort | uniq -c | sort -rn`
   — add `and .name=="Skill"` piped to `.input` for skill calls; subagent
   transcripts sit under `<uuid>/subagents/`.
2. The sandbox on disk (`readlink <run>/<scenario>/run-N/sandbox`) — what the
   agent actually wrote settles claims no transcript reading can.
3. The failed agent itself, when the diagnosis is about wording. Resume in place
   (`cd <sandbox> && HOME=<bench-home> claude -p --resume <uuid> "<question>"`)
   and ask neutrally which phrase left room and what the rule would have had to
   say. Three runs named the same defective sentence in one round on 2026-08-21,
   after three rounds of guessing had not. The transcript shows what it did; the
   interview shows the words it justified it with, and those are the ones to fix.
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
several red scenarios in hand, check that each isolates a different hypothesis.
Terminate at ~80 %, after three experiments that move nothing, or 5 iterations.

Diagnostic edits are reverted from `cp` backups — never with `git checkout --`
or `git restore`, which return the index rather than what you wrote.

## Phase 3 — Fix

- **Product**: edit `framework/atoms/<name>.md` (or the skill/agent file), then
  `deno run -A scripts/generate-skill-composites.ts --write`. Generated
  `SKILL.md` files are gitignored build artefacts.
- **Instrument**: edit `scripts/acceptance-tests/lib/`. Extract the decision into
  a pure exported function and unit-test it in a file `deno task check` actually
  runs, NOT `runner_test.ts`, which `task-check.ts` ignores.
- **Contract**: edit the scenario or its fixture, saying in the file what the old
  version held and why it was wrong.

Every fix carries, in the file it touches, the measurement that justified it:
date, runs, what the sessions showed.

## Phase 4 — Verify

- Single scenario, cache bypassed, in the background, `.env` sourced in the same
  shell (they do not persist): `deno task acceptance-tests -f <id> -n 3`. `-f`
  takes ONE substring, last wins; `-p` sets concurrency; the lock forbids
  concurrent runs. A foreground run past the tool's cap is killed mid-flight.
- Host preflight: load, free swap, orphaned runners (`ps -Ao pid,etime,command |
  grep -E "runtests.py|benchmark.ts run"`). Under memory pressure `system_health`
  aborts sessions and every result is noise.
- An instrument fix is verified by its unit test AND by the scenario it misread;
  a product fix, against the raw sessions and the sandbox. The number has to move
  for the reason claimed.
- Name what the green number covers. A rule phrased "if you see X" binds at
  every stage but the suite usually holds one, so "3/3" reads as general when it
  is not.
- `deno task check` before every commit. Its verdict is the final
  `N passed | M failed` line; the three `=== FAIL deno eval Deno.exit(...)` lines
  are intentional fixtures.

## Phase 5 — Record and commit

- Update the docs the change maps to (AGENTS.md Documentation Map): an
  instrument change in SDS §3.4, a trigger lesson in FR-ACCEPT.TRIGGER. When the
  doc records the behaviour you are changing as deliberate, say so and ask.
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

**Budget**: stay under ~240 lines. When an addition would pass that, compress an
existing item instead of appending — two bullets on one failure shape are one
bullet. Growth without pruning turns the signature list into something nobody
reads to the end. Commit the amendment with the work that produced it and say
what was learned, not that the skill was updated.

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
