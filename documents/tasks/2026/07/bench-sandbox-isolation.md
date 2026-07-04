---
date: "2026-07-04"
status: done
implements: [FR-BENCH-SWE]
tags: [benchmark, harness, isolation, contamination]
related_tasks: [2026/07/bench-judge-gate.md]
---
# Move bench-agent sandboxes outside $HOME (contamination fix)

## Goal

Bench measurements must not inherit the developer's personal agent rules.
Confirmed live (judgegate run, 2026-07-04): the bench agent narrates in Russian
in-sandbox because ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up
the cwd path, e.g. `~/AGENTS.md`, `~/www/CLAUDE.md`) load REGARDLESS of the
isolated `HOME`. The judge is already protected (temp cwd); the agent is not.

## Overview

### Context

- Mechanism proven by bisection on the gate judge (see `gate.ts` doc comment):
  isolated HOME + cwd under `$HOME` → personal rules load; same HOME + cwd in
  a temp dir → they do not.
- `runArm` (`scripts/benchmark/run.ts`) currently puts the sandbox at
  `<outDir>/<arm>/<instance>/sandbox` — under the repo, hence under `$HOME`.
  `prepareAcpClaudeHome` builds `bench-home` as a sibling of the sandbox.
- Root-cause workflows read the post-run sandbox and transcripts from the run
  dir; discoverability must survive the move.

### Current State

Sandbox + bench-home under the run dir; transcripts (`<instance>.log`) and
predictions in the same dir. All prior runs contaminated (recorded in the
2026-07-04 report).

### Constraints

- Deterministic per outDir (orchestrator resume keys on the predictions file).
- Fail fast if the computed external root still lies under `$HOME` — no
  silent fallback to the old location.
- Keep artifacts (logs, predictions) in the run dir; only sandbox + bench-home
  move. Symlinks at the old paths preserve post-run analysis workflows.
- Temp locations are reboot-volatile — acceptable: sandboxes are already
  routinely deleted by disk hygiene; analysis happens same-day.

## Definition of Done

- [x] FR-BENCH-SWE: external sandbox root is deterministic, outside `$HOME`,
      and throws when it would land under `$HOME`.
  - Test: `scripts/benchmark/sandbox_root_test.ts`
  - Evidence: `deno test -A scripts/benchmark/sandbox_root_test.ts`
- [x] FR-BENCH-SWE: old sandbox/bench-home paths become symlinks to the
      external location (idempotent on resume).
  - Test: `scripts/benchmark/sandbox_root_test.ts` (link helper)
  - Evidence: `deno test -A scripts/benchmark/sandbox_root_test.ts`
- [x] Wiring: `runArm` passes the REAL external path as the agent workspace.
  - Test: type-checked wiring over tested helpers
  - Evidence: `deno task check`

## Solution

1. New `scripts/benchmark/sandbox_root.ts`:
   - `externalSandboxRoot(outDir, {tmpBase, home})` → `<tmpBase>/flowai-bench/<basename(outDir)>-<sha256_8(outDir)>`; throws if under home.
   - `linkIntoRunDir(instDir, extInstDir)` → replaces `instDir/sandbox` and
     `instDir/bench-home` with symlinks to the external dirs.
2. `run.ts`: compute the root once per run; `sandboxDir` under it; symlink after
   the session; header comment updated.
3. SRS FR-BENCH-SWE: one sentence on sandbox isolation + test reference.
