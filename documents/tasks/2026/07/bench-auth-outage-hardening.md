---
date: 2026-07-30
status: done
implements:
  - FR-BENCH-SWE.POOL2
tags: [benchmark, harness, honesty]
related_tasks:
  - documents/tasks/2026/07/bench-sandbox-deps.md
  - documents/tasks/2026/07/bench-operator-every-turn.md
---
# A dead human emulator must not read as fifteen honest misses

## Goal

An external auth outage voided a whole rep, and the harness recorded it as a
measurement. Two silent-corruption paths, both fixed.

## Overview

### Context

On 2026-07-30 the account's OAuth refresh token was revoked server-side. The
CLI's own debug log says it plainly:

```
[Bootstrap] Skipped: no usable OAuth, WIF, or API key
API auth_error: OAuth refresh token is no longer valid; run /login to re-authenticate
```

The trigger was NOT the benchmark: the credential record was cleared at 03:52
local, eighteen minutes before the campaign started, while no bench process
existed. An investigation (`/investigate`) narrowed the mechanism but could not
establish the trigger — the candidates are an account-level session revocation,
two credential records rotating against each other, or a version migration.
Left undetermined on purpose rather than guessed.

What the harness did with it is the defect:

1. The human emulator is a separate `claude -p` process, so its failure never
   reaches ACP and `isAuthFailure` (which requires the JSON-RPC `-32000`) could
   not see it. 14 of 15 sessions banked an empty patch as an honest miss.
2. The discarded rep was re-run under the same grading id, so swebench replayed
   its cached verdicts: `14 instances already run, skipping...`, and the cell
   showed `resolved: true` against predictions of 0 bytes.

### Current State

`isAuthFailure` matched only the ACP shape. `campaignRunId(c, rep)` had no
notion of a second attempt at the same rep.

### Constraints

- Deno + TS, Code TDD.
- Attempt 1 must keep every historical run id byte-identical — the pool2 freeze
  was derived from graded logs living under those paths.
- A RESUME must keep its id (reusing its own cache is the point); only a
  re-measurement may move.

## Definition of Done

- [x] FR-BENCH-SWE.POOL2: a dead human emulator leaves the instance unmeasured
  - Test: `scripts/benchmark/run_test.ts::isEmulatorOutage: a dead human emulator leaves the instance unmeasured, not missed`
  - Evidence: `deno test -A scripts/benchmark/run_test.ts`
- [x] FR-BENCH-SWE.POOL2: a session that did real work before the emulator died
      stays a genuine measurement
  - Evidence: `grep -n "authFailed && !" scripts/benchmark/pool2_measure.ts` — the
    pending path still requires an empty patch (`mempalace-1004` shipped 31 KB
    through exactly this case)
- [x] FR-BENCH-SWE.POOL2: a re-measured rep cannot inherit a discarded run's
      verdicts, and a resume cannot lose its own cache
  - Test: `scripts/benchmark/pool2_measure_test.ts::resolveRunAttempt: a resume keeps its id, a re-measurement moves off the stale cache`
  - Test: `scripts/benchmark/pool2_measure_test.ts::campaignRunId: attempt 1 keeps the historical id, later attempts get their own`
  - Evidence: `deno test -A scripts/benchmark/pool2_measure_test.ts`
- [x] Docs match the code (SRS FR-BENCH-SWE.POOL2, SDS §3.22)
  - Evidence: `deno task check` — exit 0
- [x] `deno task check` green
  - Evidence: `deno task check` — exit 0 (2026-07-30)

## Solution

1. `run.ts`: `isEmulatorOutage(logs)` matching the wrapper's
   `Claude CLI failed (exit N)`. Keyed on that rather than on auth text because
   the CLI's result JSON is truncated in the session log, and an emulator that
   dies for any reason leaves the same hole. `runArm` flags `authFailed` when
   EITHER detector fires.
2. `pool2_measure.ts`: `resolveRunAttempt({recorded, hasPredictions, taken})` and
   `campaignRunId(c, rep, attempt)` with an `-a<attempt>` segment for attempt > 1.
3. `benchmark.ts`: resolve the attempt before the batch from the rep's
   `run-meta.json`, the predictions file and the graded-log dir listing; stamp it
   into `run-meta.json`; grade under it.

## Not done here

- Pinning a dedicated long-lived token for the bench instead of sharing the
  operator's interactive credentials. Offered and not chosen — it would move the
  bench off the auth the earlier campaigns were measured on.
