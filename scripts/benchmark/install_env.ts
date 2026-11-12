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
import { writeLoginShellPathPrepend } from "@acceptance-tests/acp/mock_bin.ts";

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
 * pip switches inherited from the operator's shell that would let a pip
 * outside the venv write anyway. Booleans are pinned off by value; pip parses
 * "0" as false (verified against pip 26.2).
 */
const PIP_SWITCHES_OFF = ["PIP_BREAK_SYSTEM_PACKAGES", "PIP_USER"] as const;

/**
 * pip install-location overrides. No value neutralises them — an empty string
 * is still a location to pip — and the agent's env cannot unset what the
 * launcher inherits, so their presence stops the run.
 */
const PIP_LOCATION_VARS = ["PIP_TARGET", "PIP_PREFIX", "PIP_ROOT"] as const;

/**
 * Confine every Python install the AGENT makes to the sandbox venv
 * (FR-BENCH-SWE.POOL2).
 *
 * Before the venv existed (until 2026-07-30) bench agents reached the host's
 * Homebrew pip, hit PEP 668's "externally-managed-environment", and retried
 * with `--break-system-packages`: ~970 packages (4 GB, editable installs
 * pointing into deleted sandboxes) landed in `/opt/homebrew/lib/python3.*`,
 * blocked `brew link` for weeks and overwrote `/opt/homebrew/bin/mcp`. A venv
 * first on PATH alone does not close that: macOS `path_helper` reorders PATH
 * in login shells and puts the venv behind `/usr/bin`, and an interpreter of
 * another minor version (`python3.12 -m pip`) is never in the venv at all.
 *
 * So the env carries three layers: the venv first on PATH, repeated in the
 * isolated HOME's login profile so `path_helper` cannot demote it;
 * `PIP_REQUIRE_VIRTUALENV=1`, which makes any pip running outside a venv
 * refuse to install, `--break-system-packages` and `--user` included; and the
 * operator's pip escape switches pinned off. It is env, so pip obeys it by
 * choice — `uv pip install --system` and an explicit `--no-require-virtualenv`
 * still get through (user decision 2026-11-13: env layer only).
 *
 * `inherited` is the env the launcher passes down (Deno.Command merges, it
 * never clears).
 */
export async function agentPythonEnv(
  venvDir: string,
  homeDir: string,
  parentPath: string,
  inherited: Record<string, string> = Deno.env.toObject(),
): Promise<Record<string, string>> {
  const env = venvOnlyEnv(venvDir, parentPath, inherited);
  await writeLoginShellPathPrepend(homeDir, join(venvDir, "bin"));
  return env;
}

/** The env overrides that confine pip to `venvDir`; see {@link agentPythonEnv}. */
function venvOnlyEnv(
  venvDir: string,
  parentPath: string,
  inherited: Record<string, string>,
): Record<string, string> {
  const set = PIP_LOCATION_VARS.filter((k) => (inherited[k] ?? "") !== "");
  if (set.length > 0) {
    throw new Error(
      `${set.join(", ")} set in the bench's environment would redirect pip ` +
        `installs out of the sandbox venv; unset ${set.join(" ")} and rerun`,
    );
  }
  const env: Record<string, string> = {
    PATH: `${join(venvDir, "bin")}:${parentPath}`,
    VIRTUAL_ENV: venvDir,
    PIP_REQUIRE_VIRTUALENV: "1",
  };
  for (const k of PIP_SWITCHES_OFF) env[k] = "0";
  return env;
}

/**
 * Build `<sandbox>/.venv` and replay the recipe inside it.
 *
 * `cfg` null (the row carries no recipe) still builds an EMPTY venv: without
 * one, `pip` on the agent's PATH is the host's own. A venv that cannot be built
 * is thrown for the same reason — a failing recipe STEP is reported instead.
 *
 * `pipCacheDir` is shared across instances so the wheels are downloaded once
 * per campaign rather than once per session — the same recipe runs 45 times
 * over three reps of two arms.
 */
export async function installProjectDeps(
  sandboxDir: string,
  cfg: InstallConfig | null,
  { pipCacheDir }: { pipCacheDir?: string } = {},
): Promise<InstallOutcome> {
  const venv = join(sandboxDir, VENV_DIR);
  const venvBin = join(venv, "bin");
  const pythonBin = await resolvePython(cfg?.python ?? "");
  const lines: string[] = [];
  const steps: StepResult[] = [];

  const { steps: recipe, unsupported } = cfg
    ? buildInstallSteps(cfg)
    : { steps: [], unsupported: [] };
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
    throw new Error(
      `cannot build the sandbox venv (${pythonBin} -m venv ${VENV_DIR}, ` +
        `exit ${venvRes.code}) — the agent would get the host's pip:\n` +
        venvRes.output,
    );
  }

  // The recipe is dataset text: confine it exactly like the agent, so a
  // `python3.12 -m pip install` line cannot reach the host either. Its HOME is
  // the operator's, so no login profile is written for it.
  const inherited = Deno.env.toObject();
  const env: Record<string, string> = {
    ...inherited,
    ...venvOnlyEnv(venv, inherited.PATH ?? "", inherited),
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
