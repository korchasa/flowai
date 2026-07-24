/**
 * SWE-rebench grading path for the pool2 funnel (FR-BENCH-SWE.POOL2).
 *
 * Fresh post-cutoff instances come from the `nebius/SWE-rebench-leaderboard`
 * monthly splits. The STOCK princeton `swebench` harness cannot grade these
 * repos (no per-repo specs), so grading goes through SWE-rebench's own
 * SWE-bench fork (based on swebench Release 4.0.3) — their official
 * evaluation path, which reads `install_config` from each instance (user
 * decision 1A, 2026-07-22). Grading stays official-for-the-dataset Python +
 * Docker; never reimplemented in TS.
 *
 * Containers: prebuilt amd64 images (`swerebench/sweb.eval.x86_64.*`, carried
 * by each row's `image_name`) run under Rosetta on the arm64 host (user
 * decision 2A; the fork hardcodes arch x86_64 and uses `image_name` verbatim).
 * Probe evidence 2026-07-22: gold grade of `tox-dev__tox-3904` (2026_03)
 * resolved 1/1 in 23 s through this exact path.
 */

import { join } from "@std/path";
import { parseReport, type VerifyReport } from "./verify.ts";

export const REBENCH_DATASET = "nebius/SWE-rebench-leaderboard";
export const REBENCH_VENV_PYTHON = ".venv-rebench/bin/python";
export const FORK_DIR = ".swe-bench-fork";
export const FORK_REPO_URL =
  "https://github.com/SWE-rebench/SWE-bench-fork.git";
/** Pinned fork commit — recorded in pool2 provenance; setup checks it out. */
export const FORK_PINNED_COMMIT = "e4907b7a90eafaa1f0a6428fd04fe31cdd8b4284";

export interface RebenchEvalOptions {
  /** "gold" or a path to a predictions JSONL file. */
  predictionsPath: string;
  runId: string;
  /** model_name_or_path used to locate the report file ("gold" for --gold). */
  modelName: string;
  /** Leaderboard monthly split, e.g. "2026_03". */
  split: string;
  instanceIds?: string[];
  maxWorkers?: number;
  cwd?: string;
}

/** Pure arg builder for the fork's run_evaluation (unit-testable). */
export function buildRebenchArgs(opts: RebenchEvalOptions): string[] {
  const args = [
    "-m",
    "swebench.harness.run_evaluation",
    "--dataset_name",
    REBENCH_DATASET,
    "--split",
    opts.split,
    "--predictions_path",
    opts.predictionsPath,
    "--run_id",
    opts.runId,
    "--max_workers",
    String(opts.maxWorkers ?? 1),
  ];
  if (opts.instanceIds && opts.instanceIds.length > 0) {
    args.push("--instance_ids", ...opts.instanceIds);
  }
  return args;
}

/**
 * Run the fork's `run_evaluation` inside `.venv-rebench` and parse the report
 * (same report schema as the princeton harness — `parseReport` is reused).
 * Throws if the subprocess fails or the report file is absent.
 */
export async function runRebenchEvaluation(
  opts: RebenchEvalOptions,
): Promise<VerifyReport> {
  const cwd = opts.cwd ?? Deno.cwd();
  const cmd = new Deno.Command(join(cwd, REBENCH_VENV_PYTHON), {
    args: buildRebenchArgs(opts),
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await cmd.output();
  if (code !== 0) {
    throw new Error(`fork run_evaluation exited with code ${code}`);
  }
  const reportPath = join(cwd, `${opts.modelName}.${opts.runId}.json`);
  let raw: string;
  try {
    raw = await Deno.readTextFile(reportPath);
  } catch {
    throw new Error(`fork report not found at ${reportPath}`);
  }
  return parseReport(JSON.parse(raw));
}

async function run(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<void> {
  const p = new Deno.Command(cmd, {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await p.output();
  if (code !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with code ${code}`);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Idempotent setup of the SWE-rebench grading path: clone the fork at the
 * pinned commit (detached checkout — provenance stability over branch drift),
 * create `.venv-rebench`, install the fork editable. Both paths are
 * gitignored. Safe to re-run; re-pins the commit on every run.
 */
export async function ensureRebenchSetup(
  cwd: string = Deno.cwd(),
): Promise<void> {
  const forkDir = join(cwd, FORK_DIR);
  if (!(await exists(join(forkDir, ".git")))) {
    console.log(`[rebench-setup] cloning fork → ${FORK_DIR}`);
    await run("git", ["clone", FORK_REPO_URL, FORK_DIR], cwd);
  }
  await run("git", ["fetch", "--quiet", "origin"], forkDir);
  await run("git", ["checkout", "--quiet", FORK_PINNED_COMMIT], forkDir);

  const py = join(cwd, REBENCH_VENV_PYTHON);
  if (!(await exists(py))) {
    console.log(`[rebench-setup] creating venv .venv-rebench`);
    await run("python3", ["-m", "venv", ".venv-rebench"], cwd);
  }
  console.log(`[rebench-setup] installing fork (editable) @ pinned commit`);
  await run(py, ["-m", "pip", "install", "-q", "--upgrade", "pip"], cwd);
  await run(py, ["-m", "pip", "install", "-q", "-e", FORK_DIR], cwd);
  console.log(`[rebench-setup] done (fork @ ${FORK_PINNED_COMMIT})`);
}
