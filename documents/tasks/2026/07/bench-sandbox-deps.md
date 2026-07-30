---
date: 2026-07-28
status: done
implements:
  - FR-BENCH-SWE.POOL2
tags: [benchmark, sandbox, environment]
related_tasks:
  - documents/tasks/2026/07/bench-flowai-rep1-defects.md
  - documents/tasks/2026/07/bench-operator-every-turn.md
---
# Install the project's own dependencies in the agent sandbox

## Goal

Grading runs in the dataset's Docker image, where the project is installed. The
agent worked in a bare clone: no importable package, no runnable suite. That gap
charged flowai for the harness's missing environment.

## Overview

### Context

flowai holds a RED → GREEN → REFACTOR discipline that needs the suite. Where the
suite cannot run, the discipline turns into refusing to work — and the seeded
`AGENTS.template.md:273` says exactly that ("root cause outside your control →
STOP immediately and ask"). The bare arm has no such rule and simply writes code.
Measured on rep 1 (2026-07-28): `smolvm-172` ("Cargo has no configured Rust
toolchain") and `virtualizarr-979` ("cannot collect tests due to missing `h5py`")
both ended with no patch at all.

Every SWE-rebench row carries the recipe the graders use, in `install_config`.
The harness already reads that field on the grading side (the fork uses it to
build the image); nothing carried it to the agent side.

### Current State

`prepareSandbox` produced a clean checkout and stopped there. `InstanceData` had
no dependency field, and the agent's PATH was the host's.

### Constraints

- Deno + TS, Code TDD, no new runtime deps.
- FR-BENCH-SWE.SYMMETRY: the environment must be identical in both arms.
- The host is macOS/arm64; the recipes were written for the graders' Debian
  images, so `apt-get` steps cannot run.
- The venv must never reach a prediction.

## Definition of Done

- [x] FR-BENCH-SWE.POOL2: the row's recipe reaches the sandbox and runs in a venv
      inside it
  - Test: `scripts/benchmark/install_env_test.ts::installProjectDeps: builds a venv in the sandbox and runs the steps inside it`
  - Test: `scripts/benchmark/pool2_dataset_test.ts::loadPool2InstanceData: carries the row's install recipe, and null when the row has none`
  - Evidence: `deno test -A scripts/benchmark/install_env_test.ts scripts/benchmark/pool2_dataset_test.ts`
- [x] FR-BENCH-SWE.POOL2: a step that cannot run on this host stops the recipe and
      is reported, never thrown
  - Test: `scripts/benchmark/install_env_test.ts::installProjectDeps: a failing step stops the recipe and is reported, never thrown`
  - Evidence: `deno test -A scripts/benchmark/install_env_test.ts`
- [x] FR-BENCH-SWE.POOL2: nothing is guessed — no recipe means a bare clone, and a
      conda spec is reported rather than dropped
  - Test: `scripts/benchmark/install_env_test.ts::parseInstallConfig: reads the dataset dict, absent config is null not a guess`
  - Test: `scripts/benchmark/install_env_test.ts::buildInstallSteps: an empty recipe yields no steps, and a conda spec is reported not silently dropped`
  - Evidence: `deno test -A scripts/benchmark/install_env_test.ts`
- [x] FR-BENCH-SWE.SYMMETRY: the venv is installed and put on PATH for BOTH arms,
      before the arm-specific setup
  - Evidence: `grep -n "installProjectDeps" scripts/benchmark/run.ts` — called before the `opts.arm === "flowai"` branch, and its `venvBin` prepended to the shared `env.PATH`
- [x] FR-BENCH-SWE: the venv cannot reach a prediction
  - Evidence: `grep -n "excludeVenvLocally" scripts/benchmark/install_env.ts` plus `.venv` in `DIFF_EXCLUDES` (`scripts/benchmark/predictions.ts`)
- [x] The recipes actually work on the frozen pool
  - Evidence: smoke over all 15 instances — 13 recipes complete, 2 stop at their
    trailing `apt-get`; 14 of 15 target test files collect (the 15th,
    `hermes-webui-1818`, is a file the gold test_patch adds, so its absence at
    base_commit is correct). 9–46 s per instance with a shared pip cache.
- [x] Docs match the code (SRS FR-BENCH-SWE.POOL2, SDS §3.22)
  - Evidence: `deno task check` — exit 0
- [x] `deno task check` green
  - Evidence: `deno task check` — exit 0 (2026-07-28)

## Solution

1. `install_env.ts`: `InstallConfig` + `parseInstallConfig` (tolerant read of the
   row's dict, `null` when absent), `buildInstallSteps` (pre_install → pip_packages
   → install, with `packages` reported as unsupported), `installProjectDeps`
   (build `<sandbox>/.venv` with the pinned interpreter, run each step under that
   venv's PATH with a shared `PIP_CACHE_DIR`, stop and report on the first
   failure), `excludeVenvLocally`.
2. `dataset.ts`: `InstanceData.installConfig`. `pool2_dataset.ts` fills it.
3. `run.ts`: install right after `prepareSandbox`, write `install.log`, prepend
   `venvBin` to the shared `env.PATH`.
4. `predictions.ts`: `*.egg-info` added to `DIFF_EXCLUDES` (`pip install -e .`
   leaves one in the repo root).

## Not done here

- Running the sessions in the dataset's Docker image instead of on the host.
  That would remove the `apt-get` gap entirely, but it is a different harness.
