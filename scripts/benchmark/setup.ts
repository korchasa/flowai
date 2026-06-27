/**
 * Idempotent environment setup for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * Creates the `.venv-swebench` Python venv (gitignored), installs the official
 * `swebench` + `datasets` packages, and warms the Verified dataset cache so the
 * later orchestration runs offline-fast. Safe to re-run.
 */

import { join } from "@std/path";
import { DATASET, VENV_PYTHON } from "./verify.ts";

const VENV_DIR = ".venv-swebench";

async function run(cmd: string, args: string[], cwd: string): Promise<void> {
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

/** Ensure venv + swebench + cached dataset are present. */
export async function ensureSetup(cwd: string = Deno.cwd()): Promise<void> {
  const py = join(cwd, VENV_PYTHON);
  if (!(await exists(py))) {
    console.log(`[setup] creating venv ${VENV_DIR}`);
    await run("python3", ["-m", "venv", VENV_DIR], cwd);
  }
  console.log("[setup] installing swebench + datasets");
  await run(py, ["-m", "pip", "install", "-q", "--upgrade", "pip"], cwd);
  await run(py, ["-m", "pip", "install", "-q", "swebench", "datasets"], cwd);

  console.log(`[setup] warming dataset cache (${DATASET})`);
  await run(
    py,
    [
      "-c",
      `from datasets import load_dataset; print("cached", len(load_dataset("${DATASET}", split="test")), "instances")`,
    ],
    cwd,
  );
  console.log("[setup] done");
}
