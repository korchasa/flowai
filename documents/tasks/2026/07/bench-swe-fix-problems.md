---
date: "2026-07-22"
status: in progress
implements:
  - FR-BENCH-SWE
tags: [benchmark, pool, symmetry, freeze, web-audit]
related_tasks:
  - documents/tasks/2026/07/bench-swe-regression-efficiency.md
  - documents/tasks/2026/07/benchmark-system-requirements.md
  - documents/tasks/2026/07/bench-v1-harness.md
---
# FR-BENCH-SWE: fix the current benchmark's problems in place

## Goal

Make FR-BENCH-SWE campaigns honest and informative at a bounded budget
(user cap 2026-07-22: 20 instances × 3 reps = 60 graded sessions per arm).
The replace-the-benchmark track (FR-BENCH-V1) is closed; the good clauses of
its design contract are adopted piecemeal here.

## Overview

### Context

User decisions (chat, 2026-07-22), one per problem:

1. **Budget cap** — no large pool. 20 instances × 3 reps = 60 grades per arm
   per campaign (raised from 12×3 by user, 2026-07-22).
2. **Pool composition** — funnel confirmed by user (2026-07-22, option A):
   enriched fresh pool via no-LLM gates + measured headroom, with the three
   honesty rules (see Constraints).
3. **Contamination** — agreed: admit fresh post-cutoff tasks (SWE-rebench
   monthly splits; SWE-bench Verified newest task is 2023-08, inside training
   data).
4. **Arm symmetry** — agreed, with a chosen design: do NOT remove the judge
   from the flowai arm — GIVE the same judge to the bare arm too. One judge,
   able to answer agent questions, identical config in both arms → equal
   conditions. Baseline prompt loses "never stop to ask". Judge never sees
   gold patches or FAIL_TO_PASS (existing honesty rule holds).
5. **Freeze** — agreed: pre-registered campaign manifest before any runs.
6. **Network** — audit, do NOT ban: research is normal agent work. Log every
   web access; flag oracle-adjacent hits (the task's upstream fix is public
   on GitHub during the run).
7. **Grading path for pool2** (user 1A, 2026-07-22): use SWE-rebench's own
   SWE-bench fork (their official evaluation path; stock princeton harness
   cannot grade these repos). Amends the "official Python swebench"
   constraint to "the dataset's official Python evaluation path in Docker".
8. **Containers for pool2** (user 2A, 2026-07-22): prebuilt amd64 images
   under Rosetta emulation — the path proven by the probe; no local arm64
   builds.

Prior art adopted from the superseded v1 contract: endpoint decomposition
(landed — FR-BENCH-SWE.P2P), cost counters (landed — FR-BENCH-SWE.COST),
gold-run k≥3 flaky screen (SWE-bench-Live issue #47 method), pool checksum
freeze, "cost measured, never a quality criterion".

### Current State

- Harness: `scripts/benchmark/` — sequential runner, ACP transport, Docker
  swebench grading, test-hunk stripping, sandbox isolation, P2P retro,
  metrics capture.
- Pool: `pool.json` = 12 SWE-bench Verified instances, measured-headroom
  selection over OUR scaffold; all pre-cutoff (contaminated); baseline
  frozen 2026-07-05..07.
- Arms today are asymmetric: baseline = 1 neutral turn + "never stop to
  ask"; flowai = /plan → judge gate → /implement → /review.
- No manifest; exclusions decided ad hoc (requests-2317 dropped mid-flight).
- Web access unrestricted and unlogged (ACP auto-grants permissions).

### Constraints

- Campaign budget 60 graded sessions per arm (20×3). One-time pool-building
  spend is separate but must be minimized (tiered admission funnel, no-LLM
  gates first).
- Headroom enrichment is ALLOWED at this budget (без него сигнал тонет в
  шуме на n=20), but three honesty rules are mandatory: selection uses
  baseline behavior ONLY (never flowai results); pool + baseline frozen by
  checksum BEFORE any flowai run; every report labels the delta
  "headroom-conditional — mechanism finder, not a general-effect claim".
- Mid-campaign exclusions only via the pre-registered rule: gold-run
  evidence of task breakage, recorded in the report (no silent drops).
- Judge stochasticity is now a property of BOTH arms — every report states
  it.
- Grading stays the dataset's official Python evaluation path in Docker
  (princeton swebench for SWE-bench Verified; SWE-rebench's SWE-bench fork at
  a pinned commit for pool2 — user 1A 2026-07-22), never reimplemented in TS;
  runnable-on-this-machine grading (amd64 images under Rosetta, user 2A) is
  an admission gate.

## Definition of Done

- [ ] FR-BENCH-SWE.POOL2: fresh frozen pool — 20 post-cutoff instances
      admitted via the gate funnel (arm64 gold-grade proof → gold-stability
      k=3 on unmodified repo → measured headroom on the NEW symmetric
      baseline, keep-rule Sonnet 0–1/3 ∧ someone-solves), committed as
      `pool2.json` + provenance file.
  - Test: pool2 integrity test in `scripts/benchmark/instances_test.ts`
    (every member passes the funnel over committed provenance)
  - Evidence: `deno test -A scripts/benchmark/instances_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: one judge-operator for BOTH arms — answers
      agent questions from issue+context only (never gold), identical
      config; baseline prompt without "never stop to ask"; flowai keeps its
      slash-command turns, baseline keeps free-form turns. Known residual
      (disclosed, revisit after the first symmetric campaign): flowai's
      scripted `/implement`/`/review` turns still say "proceed without
      further questions" — mid-workflow questions are judge-answered only in
      the bare arm.
  - Test: `scripts/benchmark/gate_test.ts` + `operator_test.ts` (symmetric
    wiring, no-gold input, fail-fast on judge failure in either arm)
  - Evidence: `deno test -A scripts/benchmark/gate_test.ts scripts/benchmark/operator_test.ts`
- [ ] FR-BENCH-SWE.FREEZE: campaign manifest (pool checksum, prompt hashes,
      session caps, model snapshot, grading config, exclusion rule) written
      before runs; `run`/`report` fail fast without a valid manifest and
      record its hash in every report.
  - Test: manifest validator test (new `scripts/benchmark/manifest_test.ts`)
  - Evidence: `deno test -A scripts/benchmark/manifest_test.ts`
- [x] FR-BENCH-SWE.WEBAUDIT: per-instance web-access log extracted from
      bench-home transcripts (WebFetch/WebSearch tool calls + `http(s)` URLs
      in Bash commands — curl bypass), persisted next to metrics; report
      section listing accesses with oracle-adjacent flagging (URL mentions
      the instance's repo fix/PR/commit, or repo name + ticket number);
      flagged, never banned. SRS status stays `[ ]` until the shared live
      smoke (one `run --arm baseline --limit 1` session, same as COST)
      confirms `<id>.webaudit.json` lands on disk — manual, korchasa.
  - Test: extraction + flagging test (new `scripts/benchmark/webaudit_test.ts`)
  - Evidence: `deno test -A scripts/benchmark/webaudit_test.ts`
- [ ] Campaign: build pool2 via the funnel (baseline reps double as the
      frozen baseline arm), freeze manifest, run flowai 3 reps, grade,
      publish report with P2P decomposition + cost + web audit.
  - Evidence: committed report under `documents/benchmarks/` — manual —
    korchasa (LLM cost)
- [ ] `deno task check` green; SRS sub-FRs added phase-by-phase
      (SRS → SDS → implement per phase).
  - Evidence: check log summary `N passed | 0 failed`

## Solution

User selections (2026-07-22): funnel = option A as designed; layout = 20×3.
Phase order is dependency-driven: the selection baseline reps become the
frozen baseline arm, so the symmetric harness and the web audit MUST exist
before any selection run.

### Phase 1 — SYMMETRY (harness change first)

1. SRS: add `#### FR-BENCH-SWE.SYMMETRY` (SRS → SDS → code, TDD).
2. Generalize the judge (`gate.ts`) into a single judge-operator serving
   BOTH arms: input = issue + conversation so far (never gold patches /
   FAIL_TO_PASS); for flowai it authors the gate turn as today; for baseline
   it answers agent questions. Same model/config in both arms.
3. `operator.ts`: baseline prompt drops "never stop to ask" (questions
   allowed, same human availability in both arms); equal session shape —
   `maxSteps` identical for both arms (3).
4. `run.ts`: wire the operator into the baseline arm; reports state judge
   stochasticity for both arms.

### Phase 2 — WEBAUDIT (before selection, so baseline sessions are audited)

1. SRS: `#### FR-BENCH-SWE.WEBAUDIT`.
2. `webaudit.ts`: extract WebFetch/WebSearch tool calls from bench-home
   transcripts (same harvest pass as metrics), persist
   `<instance>.webaudit.json`; flag oracle-adjacent URLs (instance's repo
   PR/commit/issue paths). Flagged and reported, never banned.
3. Report section: per-arm web-access summary + flags.

### Phase 3 — POOL2 funnel tooling

0. Probe FIRST (cheap, no-LLM): gold-grade 1–2 SWE-rebench instances
   locally on arm64. Known risk from v1 research: SWE-rebench images are
   amd64-only; if local grading is infeasible → STOP, report to user (no
   silent fallback).

   **Probe results (2026-07-22) — GO, with one open decision:**
   - Candidate source confirmed: `nebius/SWE-rebench-leaderboard` has
     monthly splits through `2026_03`; post-2025-08 splits hold 463
     instances (2026-only: 263) — enough for a ~67-candidate funnel.
     Rows carry `install_config` (python, install, test_cmd, log_parser),
     F2P/P2P, `created_at`, and a prebuilt `docker_image`.
   - Prebuilt images are amd64-only (single-manifest,
     `swerebench/sweb.eval.x86_64.*`, ~1.2–1.4 GB compressed), including
     the freshest 2026_03 instances. Local Docker is OrbStack on arm64
     with Rosetta amd64 emulation.
   - Emulation probe PASSED end-to-end on `tox-dev__tox-3904`: pull 53 s;
     test_patch applied → both F2P tests FAIL pre-fix; gold patch applied
     → both PASS; whole container run ~2 s. Scientific-stack probe PASSED
     on `pgmpy__pgmpy-3137`: numpy 2.4.5 + pandas 3.0.3 import clean (no
     AVX SIGILL), 66 tests in 60 s under emulation.
   - Grading-harness fact: the STOCK princeton harness cannot grade these
     repos (no specs); SWE-rebench publish their own **SWE-bench fork**
     (based on swebench Release 4.0.3) that reads `install_config` from
     the instance — their official evaluation path. Using it amends the
     "official Python swebench" constraint → needs user sign-off.
   - Disk: 1.1 TB free; 67 candidate images ≈ 90 GB worst-case — fine,
     optionally pull→gate→remove keeping only keepers (~26 GB).

   **Tooling built + verified (2026-07-22, user decisions 1A/2A):**
   - `rebench.ts` — fork wrapper (`buildRebenchArgs`/`runRebenchEvaluation`,
     pinned commit `e4907b7a`, `.venv-rebench`, `ensureRebenchSetup` wired as
     `setup --rebench`). Fork gold probe: `tox-dev__tox-3904` resolved 1/1.
   - `pool2_fetch.ts` — datasets-server pagination, fresh-first;
     `pool2-fetch` wrote 463 candidates → `pool2_candidates.json`.
   - `pool2_gate.ts` — k-rep gold gate + incremental committed
     `pool2_provenance.json`; CLI `pool2-gate --reps/--target/--limit/
     --instance`. Smoke: `--instance tox-dev__tox-3904 --reps 3` → PASS
     `[true,true,true]`, first provenance entry recorded.
   - `deno task check` green (568 + 173 passed, 0 failed).
   - **Model snapshot PINNED (2026-07-22):** CLI alias `sonnet` resolves to
     `claude-sonnet-5` (dateless PINNED snapshot per Anthropic docs — "model
     IDs use a dateless format that is also a pinned snapshot"; verified by
     a one-shot CLI call reading `modelUsage`). Training data cutoff:
     **Jan 2026** (reliable knowledge cutoff also Jan 2026; docs
     platform.claude.com/docs/en/about-claude/models/overview). Also the
     cheapest Sonnet through 2026-08-31 (intro $2/$10 vs 4.6's $3/$15) — no
     cost reason to pick an older snapshot. Vintage boundary: admit only
     `created_at > 2026-01-31`. Provenance fields written after the batch
     (`modelSnapshot=claude-sonnet-5`, `trainingCutoff=2026-01`,
     `vintageCut=2026-01-31`).

   **GATE BATCH COMPLETE (2026-07-23):** 69 candidates gated, **67 PASS**, 2
   reject. Rejects: `pypsa__pypsa-1653`, `keras-team__keras-22642` — both
   gold patch failed the first fork rep (`reps=[false]`, no harness-error
   note → genuine non-resolution under the arm64/Rosetta path, not flake);
   both heavy scientific/ML stacks. Batch survived 3 external kills
   (overnight sleep) — restart-resumes from provenance losslessly; final run
   detached via `nohup` finished clean, no orphaned procs/containers. All 67
   passers fall in `2026-03-25 … 2026-05-12` — every one after the Jan-2026
   cutoff (fresh-first order never reached the Feb candidates). 67 passers
   span 52 unique repos (≤4 per repo), F2P 1–25, median patch ~3.3 KB.
   `deno task check` green (568 + 173). Passers are derivable from
   `pool2_provenance.json` (`pass=true`) — no separate list file (SPOT).
1. SRS: `#### FR-BENCH-SWE.POOL2`.
2. Candidate fetch: SWE-rebench monthly splits, `created_at` strictly after
   the pinned model snapshot's training cutoff (vintage rule; record
   snapshot + cutoff in provenance).
3. Gates (no LLM): arm64 build + gold patch grades green; gold-stability
   k=3 on unmodified repo (flaky/broken tasks out — SWE-bench-Live #47).
4. Tiered baseline measurement (LLM, doubles as the frozen baseline arm):
   rep 1 for all candidates → candidates reaching 2 solves get rejected as
   they exceed keep-rule 0–1/3 → complete 3 reps for the rest → keep-rule
   (Sonnet 0–1/3 ∧ someone-solves; ceiling probe via single Opus rep on
   Sonnet-0/3 candidates, tiered as in the 2026-07 expand campaign).
5. Freeze: `pool2.json` (20 instances) + provenance json + checksum.
   Estimate at ~30% keep-rate: ~67 candidates, ~150–170 baseline selection
   sessions one-time; parallelize via the expand-driver.sh pattern
   (concurrent single-instance invocations), sequential runner unchanged.

**MEASUREMENT-TIER WIRING BUILT (2026-07-23, LLM-free):** pool2 runs through
the existing symmetric harness now:
- `pool2_dataset.ts` `loadPool2InstanceData` — issue/base_commit/repo for the
  passers from the leaderboard split via the rows API (HTTP, no venv);
  dataset-agnostic `prepareSandbox` clones any GitHub repo at base_commit.
- `pool2_measure.ts` — `mapPool` (order-preserving bounded concurrency),
  `pendingIds` (resume: a killed run keeps completed instances in
  `baseline.jsonl`, restart skips them), `runBaselineBatch` (reuses exported
  `runArm`, append-only, one failed instance → empty prediction not a batch
  abort), `gradePool2Predictions` (strip test hunks → fork grade → resolved
  set). `runArm` exported from `run.ts` (no behaviour change).
- CLI `pool2-run --rep --concurrency --limit --out --no-grade`: reads passers
  from provenance, one-split guard, writes `rep<n>/solves.json`.
- All passers in ONE split (2026_03) → grading needs a single `--split`.
- `deno task check` green (574 + 173). Metered plan (user A, 2026-07-23):
  rep-1 = 67 sessions under `caffeinate`, measure real cost/time, then decide
  the full tier. Infra smoke on `aallan__vera-662_interface` first.

**EFFORT PINNED (2026-07-23, user A):** the infra smoke exposed that effort
was unpinned — Deno.Command inherits the operator's shell env, so the shell's
`CLAUDE_EFFORT=xhigh` (from a `/effort` call) silently drove the agent AND the
judge. The first smoke ran at xhigh, not the Claude Code default — its ~$2.4
session cost is an OVERESTIMATE. Left unfixed, baseline (run now) and flowai
(run later) could differ by effort alone → corrupt A/B. Fix: `run.ts`
`effortEnv(effort)` pins `CLAUDE_EFFORT` (+ neutralizes the adaptive-thinking
disable) into the env shared by agent + judge; `--effort` (default `high`)
threads through `pool2-run` → `runBaselineBatch` → `runArm`; the value is
stamped into `pool2_provenance.json` and each rep's `run-meta.json`;
`pool2-run` refuses a run conflicting with the recorded effort. Value = `high`
(realistic Claude Code default for Sonnet 5), identical in both arms. Also
fixed a latent bug: `pool2-run` passed the rep number where `loadProvenance`
expects the gold-gate `k`. Re-smoking at high to get the honest per-session
cost before launching rep 1.

**REP 1 LAUNCHED (2026-07-23):** re-smoke at high on `aallan__vera-662_interface`
solved, ~$1.88/session (vs $2.38 at xhigh; 71 vs 94 API calls) — high is
cheaper AND the honest default. Caveat: the ACP wrapper's transcript records
neither effort nor thinking blocks, so effort=high is confirmed via run-meta +
the effortEnv override semantics + the cost drop, not a transcript tag; the A/B
invariant holds regardless (both arms get the identical pinned env). Refined
estimate: rep 1 (67 sessions) ≈ ~$130, full tier (~150) ≈ ~$285. Rep 1 running
detached under `caffeinate`, concurrency 4, resumable (`pool2-run --rep 1`
skips completed instances on restart); grades via the fork at the end, writes
`rep1/solves.json`. Next after rep 1 facts: build the tiered rep-2/3 +
Opus-ceiling-probe + keep-rule selection, then freeze 20 into `pool2.json`.

**REP 1 HEALTH-ABORT INCIDENT + FIX (2026-07-23):** rep-1 at concurrency 4
overloaded the machine (memory near-full, iOS simulator + Slack/Telegram
running; load hit 84 on 10 CPU, swap 93%). The `system_health` guard did its
job and aborted 22 of 67 spawns with exit 75 BEFORE the agent ran. The old
`runBaselineBatch` recorded every session, so those 22 landed as empty
predictions — graded as baseline misses AND skipped on the next resume, i.e. an
un-run instance silently miscounted as a genuine miss. Only 45 sessions truly
ran: 20/45 resolved (~44%), real cost $43.79 → ~$0.97/session (half the $1.88
smoke estimate; ~9.3 min/session, not 16). Revised full-tier estimate ≈
$150–190, not $285. Per the CLAUDE.md guard rule the fix does NOT raise the
guard threshold — instead: (1) `isHealthAbort(code)` in `pool2_measure.ts`
detects exit 75 and `runBaselineBatch` skips appending — the instance stays
pending for a lower-concurrency resume (test added, `deno task check` green,
576 + 173); (2) purged the 22 false empties from `baseline.jsonl` (backup
`baseline.jsonl.bak-preconcurrencyfix`, stale `solves.json` removed, 45
kept); (3) resumed the 22 at concurrency 2 under `caffeinate` (user A,
2026-07-23). Verify after the resume: `wc -l baseline.jsonl` MUST reach 67
before trusting the grade — if the machine overloads again, aborted instances
stay pending and need another low-concurrency pass. Watcher lesson: the resume
log echoes full agent transcripts, so a completion-watcher must anchor on the
emitter prefix `[pool2-run] rep1: N/67 resolved`, NOT a bare `resolved` — the
first loose watch fired a false "done" on `resolved_version` in the fromager
repo's Python source (log line 10902) while the run was still in flight.

**REP 1 PROVISIONAL GRADE (2026-07-23):** the concurrency-2 resume batch
completed and graded, but the machine overloaded AGAIN from the operator's own
ambient work (recursive greps across OpsBrain repos, Spotlight `mds_stores`,
VSCodium, a second `claude` session — load 46/1min, 93/5min on 10 CPU, guard
threshold 40; my two sleeping sessions were 0% CPU, NOT the cause). So 6 of the
22 health-aborted again and are still pending. Recorded 61/67; graded
**27/67 resolved** — but 6 of that denominator never ran (miscounted as
misses), so the honest rate is **27/61 that ran ≈ 44%** (matches the earlier
20/45). 2 recorded predictions have empty patches, incl. the un-gradeable
`youssofal__mtplx-21` (base commit `c06cc13…` = `not our ref`, unfetchable →
EXCLUDE from the pool at selection, do NOT count as a baseline miss). The 6
still-pending ids: `tobymao__sqlglot-7479`, `tox-dev__tox-3904`,
`tox-dev__tox-3931`, `ucfopen__canvasapi-716`, `ultraplot__ultraplot-696`,
`zauberzeug__nicegui-5914`. Plan: a load-gated background watch waits until
1-min load < 18 (headroom under the 40 threshold), THEN launch the 6 at
concurrency 1 and re-grade — no wasted guard-aborts. deno exited cleanly after
the grade; `solves.json` currently holds the provisional 27/67 and MUST be
regenerated after the 6 run.

**AUTH-OUTAGE HARDENING + CAMPAIGN LAUNCH (2026-07-23, user A):** completing
rep-1's final 6 at a calm moment exposed a THIRD "never fairly attempted"
failure mode beyond health-abort: the operator's ACP OAuth token expired
mid-batch, so 5 of the 6 (`sqlglot-7479`, `tox-3931`, `canvasapi-716`,
`ultraplot-696`, `nicegui-5914`) died with the JSON-RPC error
`{ code: -32000, message: 'Authentication required' }` — the model never
engaged, yet the old code banked an empty diff as a genuine baseline miss. Of
the 7 total empties: 5 auth-outage (re-run), 1 genuine 20-min TIMEOUT
(`graphistry-1277`, keep as miss), 1 UNFETCHABLE (`youssofal__mtplx-21`, base
commit `not our ref` — EXCLUDE from pool at selection). Fix (TDD, tests green):
`isAuthFailure(logs)` in `run.ts` matches BOTH `-32000` AND
`Authentication required` (the code is ACP-internal, so a repo whose own source
says "Authentication required" cannot false-trip it); `runArm` returns
`authFailed`; `runBaselineBatch` leaves an auth-failed+empty instance pending
with a distinct `AUTH-FAIL` marker (mirrors `HEALTH-ABORT`). Purged the 5 from
rep-1 (`baseline.jsonl.bak-preauthfix`), removed stale `solves.json` → 62
records, 5 pending. Then launched `scripts/benchmark/pool2_campaign.sh`
(detached, nohup+caffeinate, PID at launch 76266): runs reps 1→2→3
SEQUENTIALLY (never 2 concurrent = no self-overload), each re-invokes
`pool2-run --no-grade` until 67 recorded then grades; `wait_calm` gates each
pass on 1m&5m load < 25 (headroom under the guard's 40); on a pass with 0
progress it backs off 300s for load aborts but STOPS (exit 42) on any AUTH-FAIL
so a dead token can't silently corrupt 134 sessions — re-login + re-run the
script resumes idempotently from on-disk records. Est. ~10 h wall at conc 2,
~$130. Monitor armed on `campaign.log` for rep boundaries / grades / STOP.

**SELECTION PURE LOGIC BUILT (2026-07-23, while campaign runs):**
`scripts/benchmark/pool2_select.ts` (+ 7 tests, all green) — the no-machine
half of the selection phase, ready before the data lands:
`assembleSonnetReps(rep1..3 solves)` → 0..3 count; `zeroRepIds` → the 0/3
Opus-probe queue; `buildHeadroom` → the {sonnet_reps, opus_resolved} schema
(opus null unless 0/3, so Opus runs ONLY where it can flip the keep decision);
`zeroRepsMissingOpus` → freeze-gate (non-empty = probe incomplete);
`selectPool2` reuses the shared `isHeadroomKeeper` and freezes cheapest-first
(patchBytes) N minus excluded ids. Full `deno task check` green (584 + 173).
STILL TODO (needs rep-2/3 data + machine, so deferred): Opus ceiling probe on
the 0/3 ids; `pool2-select` CLI wiring (assemble→freeze, writes `pool2.json` +
`pool2_headroom.json`); integrity test; exclude `youssofal__mtplx-21`.

**REP-1 GRADED 31/67 + DRIVER BUG FIXED (2026-07-24):** rep-1 completed
cleanly — the 5 re-run auth-fail stragglers all produced real patches
(537–6826 B), validating the auth fix end-to-end; graded **31/67** (only 2
empties left: `graphistry-1277` genuine 20-min timeout, `youssofal` unfetchable
→ exclude). But the campaign then STALLED on rep-2 for ~2 h doing nothing: the
driver wrote each pass log to `rep2/campaign-pass$N.log` BEFORE `pool2-run`
creates `rep2/`, so on a FRESH rep the shell redirect failed before deno
started — a launch failure the blind "0 progress → load abort → backoff 300s"
handler mistook for overload and spun 20× then STOPed. rep-1 worked only
because its dir pre-existed. Fixes in `pool2_campaign.sh`: (1) `mkdir -p` the
rep dir up front; (2) honest zero-progress diagnosis — AUTH-FAIL→stop(42),
HEALTH-ABORT→backoff, else→LAUNCH FAILURE stop(44) instead of a silent spin;
(3) `REPS` env (default "1 2 3") so a resume runs `REPS="2 3"` and skips
re-grading rep-1. Re-launched `REPS="2 3"` (PID 1717) at load 2.3 — rep2/ now
created, deno running. Monitor re-armed (old one followed the moved log inode
after archiving `campaign.log`→`.rep1-and-bug`).

**REP-2 AUTH-STOP #2 + CLEAN RESUME (2026-07-24):** rep-2's first pass reached
49/67 before the token expired again; the hardened driver STOPped on AUTH-FAIL
(exit 42) instead of spinning. Verified the 49 are honest — the only 2 empties
are a genuine 20-min TIMEOUT (`databricks__dbt-databricks-1428`) and the known
unfetchable `youssofal` (auth-fails correctly stayed pending, none banked as a
false miss). After re-login, resumed `REPS="2 3"` (PID 46091) — rep-2 picked up
its 18 pending from disk, deno running, monitor re-armed on a fresh
`campaign.log` (prev archived `.rep2-authstop`). The auth outage recurs roughly
per token lifetime, so more mid-campaign STOPs over the remaining ~1.5 reps are
expected; each just needs `/login` + a re-run, resuming losslessly.

**ALL 3 REPS GRADED — SELECTION DATA COMPLETE (2026-07-24):** rep-1/2/3 =
31/30/31 of 67 resolved (remarkably stable ~46% pass@1; rep-2 needed one
`/login` mid-run, rep-3 ran clean). 3-rep Sonnet distribution over 66 eligible
(youssofal excluded, unfetchable):
  - 0/3 reps: 26   -> Opus-probe queue (keep only if Opus solves = has ceiling)
  - 1/3 reps: 8    -> CERTAIN keepers (headroom, no Opus needed)
  - 2/3 reps: 12   -> reject (near-reliable, little headroom)
  - 3/3 reps: 20   -> reject (always solved, no headroom)
NEW FINDING vs forecast: only **8** certain keepers (expected ~15), so the
20-pool now hinges on the Opus probe — need ≥12 of the 26 zero-rep instances to
have an Opus ceiling. If Opus resolves <12, the pool falls short of 20. Wrote
`runs/pool2-baseline/opus_probe_queue.json` (26 ids). Freeze is GATED on every
0/3 instance having an Opus verdict (`zeroRepsMissingOpus` must be empty) — the
probe must run ALL 26 for a complete ceiling, not early-stop at 12.
Infra gap: `pool2-run` has NO `--instance` subset filter (only pool2-gate /
grade do), so running the 26 under `--model opus` into a separate `--out`
needs a small CLI addition first. Opus cost unknown (pricier than Sonnet's
~$0.97/sess) — meter the first probe session before committing all 26.

> **Path retired 2026-08-08:** `runs/pool2-baseline/` was deleted with the rest
> of the pre-cell run layout (commit `318fed26`). The 3 Sonnet reps it held
> survive as 201 rows in
> `scripts/benchmark/cells/claude-baseline-none-sonnet-high/tasks.jsonl`, and the
> derived per-instance rep counts in `scripts/benchmark/pool2_headroom.json`
> (`.instances[].sonnet_reps`). The `opus_probe_queue.json` list is recoverable
> from that same file: 27 instances carry `sonnet_reps == 0`, and the 26-id queue
> is those minus `youssofal__mtplx-21`, which is stamped `verdict: "excluded"`
> (unfetchable). Only the raw session transcripts are gone, on purpose.

**OPUS-PROBE INFRA + METERING LAUNCHED (2026-07-24, user A):** added a
`--instance` subset filter to `pool2-run` (TDD: `filterToWanted` in
pool2_select.ts, 9 tests green, fmt/lint clean) — same `collect:true` pattern
as pool2-gate; applied before `--limit`; fails fast on a non-passer id so a
typo can't silently run nothing. It reuses the SAME provenance/effort guard, so
Opus at `--effort high` matches the stamped `high` (no conflict, no
provenance write). Launched ONE metered Opus session on the cheapest 0/3
instance `pypa__twine-1309` (1131 B patch) into a SEPARATE
`runs/pool2-opus-probe/rep1` (isolated from the Sonnet reps), concurrency 1,
graded. Watching for cost + verdict before committing the other 25.

> **Path retired 2026-08-08:** `runs/pool2-opus-probe/` was deleted with the rest
> of the pre-cell run layout (commit `318fed26`). The probe's verdicts survive in
> `scripts/benchmark/pool2_headroom.json`: all 26 queued instances carry an
> `opus_resolved` field, and `.provenance.opusProbe` records the outcome
> (`queueSize: 26`, `resolved: 0`). Only the raw session transcripts are gone,
> on purpose.

**OPUS METER RESULT + FULL PROBE LAUNCHED (2026-07-24):** the meter proved Opus
runs HONESTLY, not degraded — initial read (1.2 min, 8 API calls, out 0k)
looked like a no-op but the log shows a real analyze→patch→test cycle: Opus
wrote a 576 B fix to `twine/__main__.py` (try/except around
`http.HTTPStatus()` for non-standard code 499) and ran the suite. The short
session is Opus 4.8 being far more efficient than Sonnet (8 tool calls vs
Sonnet's ~90), not a failure. Grade was honest too ("empty patches: 0" =
applied; F2P did NOT pass → 0/1 resolved = valid "no ceiling" for twine).
Cost by Opus 4.8 token rates (in $15 / out $75 / cache-r $1.50 / cache-w
$18.75 per MTok): in 10, out 147, cache-r 169698, cache-w 26317 ≈ **$0.76**
for this short session; harder instances (Opus thinking to timeout) ~$1.5–3.
Full 26-probe estimate ≈ **$40–80**, BELOW the earlier $80–130 — so, with
authorization already given (user A) and cost under estimate, proceeded without
re-asking. NOTE early pool risk: twine (Sonnet 0/3) is also Opus-unsolved; if
that pattern holds the 20-pool may fall short (need ≥12 ceilings of 26).
Launched `pool2_opus_probe.sh` (PID 51216, nohup+caffeinate) — a bash-ARRAY
launcher (the first attempt passed 26 `--instance` flags as one word-split
string → cliffy "Unknown option"; the array fixes it). Same auth-STOP /
health-backoff / launch-fail discipline as the campaign driver; --no-grade
while accumulating, grades once at the end. Monitor armed.

**OPUS 0/26 WAS A DNS BLIP, NOT A CEILING — 3rd HARDENING (2026-07-24):** the
probe graded 0/26, which was too extreme to trust — diagnosis split it clean:
13 were REAL Opus attempts (non-empty patches: twine, pyinfra, schemathesis…)
that honestly failed F2P → valid "no ceiling"; the other 13 were EMPTY with an
empty instance dir and NO log — all 13 died on `git clone … Could not resolve
host: github.com`, a transient DNS blip mid-run (the probe uses its OWN
`_repo-cache`, so it re-cloned all 26 and 13 hit the blip). This is the SAME
"never fairly attempted → banked as a false miss" bug class as HEALTH-ABORT and
AUTH-FAIL, but at the sandbox-setup stage the earlier hardening didn't cover.
Fix (TDD, 8 tests green, fmt/lint clean): `isTransientSetupFailure(msg)` in
run.ts matches the clone stage AND a transient network signature (DNS /
connection reset|refused|timeout / 429) but NOT a permanent bad base ref
(`not our ref` stays a real miss so youssofal is still excluded, not retried
forever); `runBaselineBatch` catch leaves such an instance PENDING with a
`SETUP-FAIL` marker; the probe launcher treats SETUP-FAIL as a 120 s back-off +
retry (not a stop). Purged the 13 false empties (`baseline.jsonl.bak-preclonefix`,
removed their empty dirs + stale 0/26 solves.json), kept the 13 real attempts,
and relaunched (PID 91792) to re-run only the 13. So the REAL Opus ceiling
verdict is still pending — 0/13-that-ran so far, 13 re-running.

**FINAL SELECTION: POOL = 8, NOT 20 (2026-07-24) — DECISION POINT:** the
re-run graded clean — 26/26 non-empty patches, 0 clone failures — and the
verdict is VALID: Opus resolved **0 of 26**. Opus wrote a real patch for every
0/3 instance but none passed F2P (grade is trustworthy: Sonnet patches DID pass
on other instances, 31/67). So NO 0/3 instance has a ceiling → all 26 rejected.
Final over 66 eligible: 8 keepers (Sonnet 1/3) + 0 Opus-ceiling = **POOL 8**;
26 rejected (0/3 + Opus fail, no ceiling); 32 rejected (2-3/3, no headroom).
The 8: agronholm__anyio-1121, alibaba__opensandbox-816,
graphistry__pygraphistry-1107_interface, graphistry__pygraphistry-1277,
nesquena__hermes-webui-330_interface, raullenchai__rapid-mlx-228,
tobymao__sqlglot-7479, tox-dev__tox-3931 (the last two vindicate the auth-fix —
they'd have been false 0/3s). ROOT CAUSE (not a bug): on fresh SWE-rebench
tasks our maxSteps=3 baseline scaffold is BIMODAL — Sonnet either solves
reliably (2-3/3, 32) or nobody solves even with Opus (0/3, 26); the "flowai can
help" headroom band is just 8/66. This is an honest finding about where flowai
applies, but 8 is statistically thin for an A/B. Handed to user as a decision
point (variants: freeze-8 / gate-more-candidates / relax-keep-rule to include
2/3 / revisit scaffold). Selection paused pending that choice; all data + code
durable, `deno task check` clean.

**"3 turns" CLARIFIED — SCAFFOLD IS NOT THE BOTTLENECK (2026-07-24):** `maxSteps:3`
(run.ts:273) is 3 operator↔agent DIALOGUE turns (acp_agent.ts:180 loop), NOT 3
actions — inside one turn the agent runs autonomously (dozens of tool calls) to
completion or the 20-min timeout. Checked whether Opus hit that cap: ALL 26
probe sessions finished in exactly 1 of 3 turns — 0 hit the step cap, 0 hit the
timeout. So Opus failed the 26 ON THE MERITS (patch ≠ dataset gold behaviour),
not for lack of scaffold room. This RETRACTS variant D (widening the scaffold
would not change the verdict). Remaining choices: A freeze-8 / B gate-more /
C relax-keep-rule to 2/3.

**SELECTION RESULTS SAVED — DATA-OF-RECORD (2026-07-24, user request):** saved
the full Sonnet+Opus selection outcome (including the failed variants) as a
committed, tested data-of-record. Built (TDD, all green): `classifyInstance`,
`buildHeadroomRecord`, `verdictSummary` in pool2_select.ts (+12 unit tests);
`pool2-select` CLI (`benchmark.ts`) — reads rep1-3 + Opus solves, gates on
`zeroRepsMissingOpus` (excluded-exempt), writes
`scripts/benchmark/pool2_headroom.json` = {provenance, instances{id →
sonnet_reps, opus_resolved, verdict}} for ALL 67 (66 eligible + 1 excluded);
`pool2_headroom_test.ts` (7 integrity tests re-derive every verdict from the
keep-rule, check the summary/eligible/opus-completeness invariants). Human
snapshot: `documents/benchmarks/pool2-selection-2026-07-24.md` (funnel + full
per-verdict instance lists + key finding). Verdicts: keeper 8,
reject_no_headroom 32, reject_no_ceiling 26, excluded 1; per-rep 31/30/31; Opus
0/26. `pool2_headroom.json` is git-TRACKED (runs/ stays ignored); full
`deno task check` green (597 + 173). Selection pool decision (freeze-8 /
gate-more / relax-2/3) still OPEN — the freeze (`pool2.json` + `selectPool2`
cheapest-first N) waits on that choice; the headroom data-of-record is complete
and does not depend on it.

**POOL FROZEN AT 8 (2026-07-24, user A):** chose freeze-8 (honest mechanism
finder over a padded pool). Added `--freeze` to `pool2-select` (selectPool2
re-applies the keep-rule over the SAME record, so `pool2.json` can never
disagree with the data-of-record; cap 20, 8 keepers fit). Wrote
`scripts/benchmark/pool2.json` = 8 keepers cheapest-first (patchBytes 1768→5566):
agronholm__anyio-1121, tox-dev__tox-3931, tobymao__sqlglot-7479,
raullenchai__rapid-mlx-228, alibaba__opensandbox-816,
graphistry__pygraphistry-1107_interface, nesquena__hermes-webui-330_interface,
graphistry__pygraphistry-1277. Added 3 pool2-freeze integrity tests (every
pooled id is a keeper, size == keeper count, cheapest-first). pool2.json
git-TRACKED. NEXT: Phase 4 freeze-manifest + Phase 5 flowai arm (3 reps × 8 =
24 sessions) then the headroom-conditional A/B report.

**LOAD-GATE LESSON + METERING CLOSED (2026-07-23):** a single-sample load gate
(`1min < 18`) is too twitchy on an actively-used dev machine — it fired on a
momentary lull, but by the confirm read the operator had started an Xcode build
(`swift-frontend`) and 1-min load was 101 on 10 CPU. A safe auto-relaunch gate
must require SUSTAINED calm (both 1-min AND 5-min load under ~20), not one
sample. Decision: do NOT chase lulls to squeeze the last 6 in. The metered
rep-1 OBJECTIVE (measure real cost/throughput/solve-rate before committing the
full tier) is ACHIEVED: ~$0.97/session, ~9 min/session at concurrency 2,
solve rate 27/61-that-ran ≈ 44%; full-tier estimate ≈ $150–190. The 6
stragglers + reps 2–3 + Opus-ceiling probe + keep-rule belong to the SELECTION
phase (next, user-gated) and need a quiet machine; state is durable and
resumable (`pool2-run --rep 1` picks up the 6). Handing back for the next-phase
go/no-go.

### Phase 4 — FREEZE manifest

1. SRS: `#### FR-BENCH-SWE.FREEZE`.
2. `manifest.ts`: campaign manifest = pool2 checksum, prompt hashes, session
   caps, pinned model snapshot, grading config, the exclusion rule
   (gold-run evidence only, recorded); `run`/`report` fail fast without a
   valid manifest and stamp its hash into every report.

### Phase 5 — Campaign

1. Selection output = frozen baseline arm (never re-run).
2. Write + freeze manifest.
3. flowai arm: 3 reps × 20 instances (60 sessions).
4. Grade, then `retro` decomposition + cost + web audit → committed report
   in `documents/benchmarks/` labeled "headroom-conditional — mechanism
   finder, not a general-effect claim".
