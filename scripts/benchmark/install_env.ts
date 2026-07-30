/**
 * Project-dependency installation for the agent sandbox (FR-BENCH-SWE.POOL2).
 *
 * Grading runs in the dataset's own Docker image, where the project is already
 * installed. The AGENT, by contrast, worked in a bare clone on the host: no
 * dependencies, no importable package, no runnable test suite. That is not a
 * neutral gap. flowai holds a RED → GREEN → REFACTOR discipline that requires
 * running the suite, so where the suite cannot run the discipline turns into
 * refusing to work, while the bare arm simply writes code — the harness was
 * charging flowai for its own missing environment. Measured on rep 1
 * (2026-07-28): `smolvm-172` ("Cargo has no configured Rust toolchain") and
 * `virtualizarr-979` ("cannot collect tests due to missing `h5py`") both ended
 * with no patch at all.
 *
 * Every SWE-rebench row carries the recipe the graders use (`install_config`).
 * This module replays it into a venv inside the sandbox, identically in BOTH
 * arms (FR-BENCH-SWE.SYMMETRY), and puts that venv first on the agent's PATH so
 * `python` and `pytest` resolve to it without the agent being told anything.
 *
 * The host is macOS/arm64 and the recipes were written for the images' Debian:
 * `apt-get` lines cannot run here, and some builds need toolchains the host may
 * lack. So a failing step is REPORTED, not thrown — the recipe stops there and
 * the caller logs what was reached. A partially installed environment is still
 * strictly more than the bare clone the sessions had before, and the failure is
 * on the record rather than hidden.
 */

import { join } from "@std/path";

/** Sandbox-relative venv location. Already excluded from the captured diff
 * (`DIFF_EXCLUDES` in `predictions.ts`), so it cannot leak into a prediction. */
export const VENV_DIR = ".venv";

/** The subset of the dataset's `install_config` the bench replays. */
export interface InstallConfig {
  /** Interpreter version the graders use, e.g. "3.13". */
  python: string;
  /** Commands run before the install proper. */
  preInstall: string[];
  /** Conda package spec — see {@link buildInstallSteps}; not honoured here. */
  packages: string;
  /** Extra pip requirements listed separately from `install`. */
  pipPackages: string[];
  /** The install command itself. */
  install: string;
}

function strField(row: Record<string, unknown>, k: string): string {
  const v = row[k];
  return typeof v === "string" ? v : "";
}

function listField(row: Record<string, unknown>, k: string): string[] {
  const v = row[k];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

/**
 * Read a dataset row's `install_config`. Returns null when the row carries
 * none — the sandbox then stays a bare clone, which is honest. Inventing a
 * default recipe would install the wrong thing and read as a real environment.
 */
export function parseInstallConfig(raw: unknown): InstallConfig | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  return {
    python: strField(row, "python"),
    preInstall: listField(row, "pre_install"),
    packages: strField(row, "packages"),
    pipPackages: listField(row, "pip_packages"),
    install: strField(row, "install"),
  };
}

/**
 * Order the recipe into shell steps: `pre_install`, then the separately listed
 * pip requirements, then `install` — the order the fork's environment builder
 * uses, so the bench installs what the graders install.
 *
 * `packages` is the fork's CONDA environment spec. The bench builds a venv and
 * cannot honour one, so it is returned in `unsupported` and logged rather than
 * dropped: a half-built environment must not read as a complete one.
 */
export function buildInstallSteps(
  cfg: InstallConfig,
): { steps: string[]; unsupported: string[] } {
  const steps = [...cfg.preInstall.filter((c) => c.trim() !== "")];
  if (cfg.pipPackages.length > 0) {
    steps.push(`pip install --quiet ${cfg.pipPackages.join(" ")}`);
  }
  if (cfg.install.trim() !== "") steps.push(cfg.install);
  const unsupported = cfg.packages.trim() === ""
    ? []
    : [`packages: ${cfg.packages}`];
  return { steps, unsupported };
}

/** One executed step and the exit code it returned. */
export interface StepResult {
  cmd: string;
  code: number;
}

export interface InstallOutcome {
  /** True iff the venv was built and every step exited 0. */
  ok: boolean;
  /** Absolute path to the venv's `bin` — prepend to the agent's PATH. */
  venvBin: string;
  /** Interpreter the venv was built with. */
  pythonBin: string;
  steps: StepResult[];
  /** The first step that failed, if any. */
  failedStep?: string;
  /** Full transcript: every step, its output, and the unsupported entries. */
  log: string;
}

/** Prefer the interpreter the graders pin; fall back to `python3` and say so. */
async function resolvePython(version: string): Promise<string> {
  const wanted = version.trim() === "" ? [] : [`python${version}`];
  for (const bin of [...wanted, "python3"]) {
    try {
      const { code } = await new Deno.Command(bin, {
        args: ["-V"],
        stdout: "null",
        stderr: "null",
      }).output();
      if (code === 0) return bin;
    } catch { /* not on PATH — try the next candidate */ }
  }
  throw new Error("no python interpreter found on PATH (tried python3)");
}

async function runStep(
  cmd: string,
  cwd: string,
  env: Record<string, string>,
): Promise<{ code: number; output: string }> {
  const p = new Deno.Command("bash", {
    args: ["-c", cmd],
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await p.output();
  const dec = new TextDecoder();
  return { code, output: dec.decode(stdout) + dec.decode(stderr) };
}

/**
 * Hide the venv from git in THIS checkout only.
 *
 * `captureDiff` stages the whole tree before diffing, and a venv runs from
 * ~200 MB to ~830 MB (measured across the frozen pool). Most repos already
 * ignore `.venv`, but the ones that do not would have every wheel hashed into
 * the index on every session. `.git/info/exclude` is local to the checkout: it
 * is not a tracked file, so it can never reach a prediction. The diff excludes
 * stay as the second line of defence.
 */
async function excludeVenvLocally(sandboxDir: string): Promise<void> {
  const info = join(sandboxDir, ".git", "info");
  const line = `/${VENV_DIR}/\n`;
  try {
    await Deno.mkdir(info, { recursive: true });
    const path = join(info, "exclude");
    const current = await Deno.readTextFile(path).catch(() => "");
    if (!current.includes(line)) {
      await Deno.writeTextFile(path, current + line);
    }
  } catch {
    // Not a git checkout (the unit test's failing-step case). The diff excludes
    // still cover the venv, so this is a missed optimization, not a defect.
  }
}

/**
 * Build `<sandbox>/.venv` and replay the recipe inside it.
 *
 * `pipCacheDir` is shared across instances so the wheels are downloaded once
 * per campaign rather than once per session — the same recipe runs 45 times
 * over three reps of two arms.
 */
export async function installProjectDeps(
  sandboxDir: string,
  cfg: InstallConfig,
  { pipCacheDir }: { pipCacheDir?: string } = {},
): Promise<InstallOutcome> {
  const venv = join(sandboxDir, VENV_DIR);
  const venvBin = join(venv, "bin");
  const pythonBin = await resolvePython(cfg.python);
  const lines: string[] = [];
  const steps: StepResult[] = [];

  const { steps: recipe, unsupported } = buildInstallSteps(cfg);
  for (const u of unsupported) {
    lines.push(`[install] UNSUPPORTED (venv cannot honour a conda spec): ${u}`);
  }

  await excludeVenvLocally(sandboxDir);

  lines.push(`[install] ${pythonBin} -m venv ${VENV_DIR}`);
  const venvRes = await runStep(
    `${pythonBin} -m venv ${VENV_DIR}`,
    sandboxDir,
    { ...Deno.env.toObject() },
  );
  lines.push(venvRes.output);
  if (venvRes.code !== 0) {
    return {
      ok: false,
      venvBin,
      pythonBin,
      steps: [{ cmd: `${pythonBin} -m venv ${VENV_DIR}`, code: venvRes.code }],
      failedStep: `${pythonBin} -m venv ${VENV_DIR}`,
      log: lines.join("\n"),
    };
  }

  const env: Record<string, string> = {
    ...Deno.env.toObject(),
    PATH: `${venvBin}:${Deno.env.get("PATH") ?? ""}`,
    VIRTUAL_ENV: venv,
    PIP_DISABLE_PIP_VERSION_CHECK: "1",
    ...(pipCacheDir ? { PIP_CACHE_DIR: pipCacheDir } : {}),
  };

  let failedStep: string | undefined;
  for (const cmd of recipe) {
    lines.push(`[install] $ ${cmd}`);
    const res = await runStep(cmd, sandboxDir, env);
    lines.push(res.output);
    steps.push({ cmd, code: res.code });
    if (res.code !== 0) {
      // Stop here: the recipe is `&&`-shaped by construction — every later step
      // assumes the earlier ones landed.
      failedStep = cmd;
      lines.push(`[install] FAILED (exit ${res.code}): ${cmd}`);
      break;
    }
  }

  return {
    ok: failedStep === undefined && unsupported.length === 0,
    venvBin,
    pythonBin,
    steps,
    failedStep,
    log: lines.join("\n"),
  };
}
