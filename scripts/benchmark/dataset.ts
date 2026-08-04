/**
 * The per-instance record every downstream stage of the benchmark speaks in
 * (FR-BENCH-SWE): repo, base commit, and issue text — enough to prepare a
 * sandbox and prompt the agent.
 *
 * Loading it is the DATASET's job, not this module's: `pool2_dataset.ts`
 * (`loadPool2InstanceData`) reads SWE-rebench rows over the HTTP rows API. The
 * princeton `SWE-bench_Verified` loader that used to live here went with the
 * rest of that path on 2026-08-04 — see
 * `documents/benchmarks/retired-approaches.md`.
 */

import type { InstallConfig } from "./install_env.ts";

export interface InstanceData {
  instanceId: string;
  repo: string;
  baseCommit: string;
  problemStatement: string;
  version: string;
  /**
   * The dataset's own dependency recipe, replayed into the sandbox venv so the
   * agent gets an importable package and a runnable suite (FR-BENCH-SWE.POOL2).
   * `null`/absent when the dataset carries none — a bare clone is honest where
   * a guessed recipe would not be.
   */
  installConfig?: InstallConfig | null;
}
