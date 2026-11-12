import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import {
  agentPythonEnv,
  buildInstallSteps,
  type InstallConfig,
  installProjectDeps,
  parseInstallConfig,
  VENV_DIR,
} from "./install_env.ts";

const ANYIO: InstallConfig = {
  python: "3.13",
  preInstall: [],
  packages: "",
  pipPackages: [],
  install: 'pip install -e ".[trio]" --quiet',
};

Deno.test("parseInstallConfig: reads the dataset dict, absent config is null not a guess", () => {
  const cfg = parseInstallConfig({
    python: "3.13",
    pre_install: ["apt-get update"],
    packages: "",
    pip_packages: ["pytest"],
    install: "pip install -e .",
    log_parser: "parse_log_pytest",
  });
  assertEquals(cfg, {
    python: "3.13",
    preInstall: ["apt-get update"],
    packages: "",
    pipPackages: ["pytest"],
    install: "pip install -e .",
  });

  // A row without the field must not be papered over with a default recipe —
  // installing the wrong thing is worse than installing nothing.
  assertEquals(parseInstallConfig(undefined), null);
  assertEquals(parseInstallConfig(null), null);
  assertEquals(parseInstallConfig("nope"), null);
});

Deno.test("buildInstallSteps: pre_install first, then pip_packages, then install", () => {
  const { steps, unsupported } = buildInstallSteps({
    python: "3.13",
    preInstall: ["make deps", "echo hi"],
    packages: "",
    pipPackages: ["pytest", "pytest-cov"],
    install: "pip install -e .",
  });
  assertEquals(steps, [
    "make deps",
    "echo hi",
    "pip install --quiet pytest pytest-cov",
    "pip install -e .",
  ]);
  assertEquals(unsupported, []);
});

Deno.test("buildInstallSteps: an empty recipe yields no steps, and a conda spec is reported not silently dropped", () => {
  assertEquals(
    buildInstallSteps({
      python: "3.13",
      preInstall: [],
      packages: "",
      pipPackages: [],
      install: "",
    }).steps,
    [],
  );

  // `packages` is the fork's conda-environment spec. The bench builds a venv, so
  // it cannot honour one — that must be visible in the log, never dropped in
  // silence, or a half-built environment would read as a complete one.
  const conda = buildInstallSteps({
    python: "3.13",
    preInstall: [],
    packages: "numpy scipy",
    pipPackages: [],
    install: "pip install -e .",
  });
  assertEquals(conda.steps, ["pip install -e ."]);
  assertEquals(conda.unsupported, ["packages: numpy scipy"]);
});

/**
 * The venv is what makes the sandbox runnable, so this test builds a real one
 * and proves the steps run INSIDE it. No network: the step only asks the
 * interpreter where it lives.
 */
Deno.test("installProjectDeps: builds a venv in the sandbox and runs the steps inside it", async () => {
  const sandbox = await Deno.makeTempDir({ prefix: "install-env-test-" });
  try {
    await new Deno.Command("git", { args: ["init", "-q", sandbox] }).output();
    const marker = join(sandbox, "prefix.txt");
    const outcome = await installProjectDeps(sandbox, {
      ...ANYIO,
      install:
        `python -c "import sys,pathlib; pathlib.Path('prefix.txt').write_text(sys.prefix)"`,
    });

    assert(outcome.ok, `install failed: ${outcome.log.slice(0, 400)}`);
    // Compared through realpath: on macOS the temp root is a symlink
    // (/var → /private/var) and the interpreter reports the resolved path.
    assertEquals(
      await Deno.realPath(await Deno.readTextFile(marker)),
      await Deno.realPath(join(sandbox, VENV_DIR)),
      "steps must run against the sandbox venv, not the host interpreter",
    );
    assertEquals(outcome.venvBin, join(sandbox, VENV_DIR, "bin"));
    assertEquals(outcome.steps.length, 1);
    assertEquals(outcome.steps[0].code, 0);

    // The venv must be invisible to git. `captureDiff` stages everything before
    // diffing, and a repo that does not already ignore `.venv` would have a
    // few hundred megabytes of wheels hashed into the index on every session.
    // The diff excludes catch it either way; this stops the work happening at
    // all, and `.git/info/exclude` is local — it never reaches a prediction.
    assertEquals(
      (await Deno.readTextFile(join(sandbox, ".git", "info", "exclude")))
        .includes(`/${VENV_DIR}/`),
      true,
      "the venv must be excluded locally, not just filtered out of the diff",
    );
  } finally {
    await Deno.remove(sandbox, { recursive: true });
  }
});

/**
 * A failing step must be reported, not thrown: the sandbox recipes carry
 * `apt-get` lines that cannot run on this host, and a partially built
 * environment still beats a session that never starts. The caller decides.
 */
Deno.test("installProjectDeps: a failing step stops the recipe and is reported, never thrown", async () => {
  const sandbox = await Deno.makeTempDir({ prefix: "install-env-test-" });
  try {
    const outcome = await installProjectDeps(sandbox, {
      ...ANYIO,
      preInstall: ["echo first", "exit 3"],
      install: "echo never-runs",
    });

    assertEquals(outcome.ok, false);
    assertEquals(outcome.steps.map((s) => s.code), [0, 3]);
    assertEquals(
      outcome.steps.map((s) => s.cmd),
      ["echo first", "exit 3"],
      "the recipe stops at the first failure — later steps assume it succeeded",
    );
    assertEquals(outcome.failedStep, "exit 3");
    assert(
      outcome.log.includes("exit 3"),
      "the log must name the step that failed",
    );
  } finally {
    await Deno.remove(sandbox, { recursive: true });
  }
});

Deno.test("installProjectDeps: a row without a recipe still gets an empty venv", async () => {
  // No recipe used to mean no venv, and then `pip` on the agent's PATH was the
  // host's own — the channel that put ~970 packages into Homebrew's Python.
  const sandbox = await Deno.makeTempDir({ prefix: "install-env-test-" });
  try {
    const outcome = await installProjectDeps(sandbox, null);
    assert(outcome.ok, `venv failed: ${outcome.log.slice(0, 400)}`);
    assertEquals(outcome.steps, []);
    assertEquals(outcome.venvBin, join(sandbox, VENV_DIR, "bin"));
    assert(
      (await Deno.stat(join(outcome.venvBin, "pip"))).isFile,
      "the venv must carry its own pip",
    );
  } finally {
    await Deno.remove(sandbox, { recursive: true });
  }
});

Deno.test("installProjectDeps: a venv that cannot be built is thrown, not reported", async () => {
  // A missing venv leaves the host's pip first on the agent's PATH, so the
  // session must not start at all.
  const sandbox = await Deno.makeTempDir({ prefix: "install-env-test-" });
  try {
    await Deno.writeTextFile(join(sandbox, VENV_DIR), "not a directory");
    await assertRejects(
      () => installProjectDeps(sandbox, ANYIO),
      Error,
      "venv",
    );
  } finally {
    await Deno.remove(sandbox, { recursive: true });
  }
});

Deno.test("agentPythonEnv: venv first, pip confined to it, escape switches neutralised", async () => {
  const home = await Deno.makeTempDir({ prefix: "install-env-home-" });
  try {
    const env = await agentPythonEnv("/sb/.venv", home, "/usr/bin:/bin", {
      PIP_BREAK_SYSTEM_PACKAGES: "1",
      PIP_USER: "1",
    });
    assertEquals(env, {
      PATH: "/sb/.venv/bin:/usr/bin:/bin",
      VIRTUAL_ENV: "/sb/.venv",
      PIP_REQUIRE_VIRTUALENV: "1",
      PIP_BREAK_SYSTEM_PACKAGES: "0",
      PIP_USER: "0",
    });
    // A pip install path inherited from the operator's shell cannot be
    // neutralised by a value, so it stops the run instead.
    await assertRejects(
      () =>
        agentPythonEnv("/sb/.venv", home, "/usr/bin", {
          PIP_TARGET: "/opt/homebrew/lib/python3.13/site-packages",
        }),
      Error,
      "PIP_TARGET",
    );
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

/** Every site-packages directory of the host interpreter, outside any venv. */
async function hostSitePackages(): Promise<{ python: string; dirs: string[] }> {
  const python = new TextDecoder().decode(
    (await new Deno.Command("bash", {
      args: ["-c", "command -v python3"],
      stdout: "piped",
    }).output()).stdout,
  ).trim();
  const { stdout } = await new Deno.Command(python, {
    args: ["-c", "import json,site; print(json.dumps(site.getsitepackages()))"],
    stdout: "piped",
  }).output();
  return { python, dirs: JSON.parse(new TextDecoder().decode(stdout)) };
}

/** name -> mtime of every top-level entry, so an added OR rewritten package shows. */
async function snapshotDirs(dirs: string[]): Promise<Map<string, number>> {
  const snap = new Map<string, number>();
  for (const dir of dirs) {
    try {
      for await (const e of Deno.readDir(dir)) {
        const st = await Deno.lstat(join(dir, e.name));
        snap.set(join(dir, e.name), st.mtime?.getTime() ?? 0);
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  return snap;
}

/** A minimal pure-Python wheel, so the install needs no network and no build. */
async function writeProbeWheel(dir: string, python: string): Promise<string> {
  const wheel = join(dir, "flowai_bench_probe-0.0.1-py3-none-any.whl");
  const script = `
import sys, zipfile
info = "flowai_bench_probe-0.0.1.dist-info"
files = {
  "flowai_bench_probe/__init__.py": "MARK = 1\\n",
  info + "/METADATA": "Metadata-Version: 2.1\\nName: flowai-bench-probe\\nVersion: 0.0.1\\n",
  info + "/WHEEL": "Wheel-Version: 1.0\\nGenerator: test\\nRoot-Is-Purelib: true\\nTag: py3-none-any\\n",
}
files[info + "/RECORD"] = "".join(p + ",,\\n" for p in files) + info + "/RECORD,,\\n"
with zipfile.ZipFile(sys.argv[1], "w") as z:
  for p, body in files.items():
    z.writestr(p, body)
`;
  const out = await new Deno.Command(python, { args: ["-c", script, wheel] })
    .output();
  assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
  return wheel;
}

/**
 * The guarantee itself, end to end against the real host interpreter: inside
 * the agent's environment every pip route ends in the sandbox venv or is
 * refused, and the host's site-packages is byte-for-byte untouched. Covers the
 * routes the bench agents actually took — a bare `pip`, `python3 -m pip` from
 * a login shell (where `path_helper` used to push the venv behind /usr/bin),
 * and the host interpreter by absolute path with `--break-system-packages`.
 */
Deno.test("agentPythonEnv: a pip install inside the sandbox never reaches the host site-packages", async () => {
  const root = await Deno.makeTempDir({ prefix: "install-env-iso-" });
  try {
    const sandbox = join(root, "sandbox");
    const home = join(root, "home");
    await Deno.mkdir(sandbox);
    await Deno.mkdir(home);
    const host = await hostSitePackages();
    const install = await installProjectDeps(sandbox, null);
    const wheel = await writeProbeWheel(root, host.python);
    const env = {
      ...Deno.env.toObject(),
      HOME: home,
      ...(await agentPythonEnv(
        join(sandbox, VENV_DIR),
        home,
        Deno.env.get("PATH") ?? "",
      )),
    };
    const sh = async (cmd: string) => {
      const o = await new Deno.Command("bash", {
        args: ["-lc", cmd],
        cwd: sandbox,
        env,
        stdout: "piped",
        stderr: "piped",
      }).output();
      const dec = new TextDecoder();
      return { code: o.code, out: dec.decode(o.stdout) + dec.decode(o.stderr) };
    };
    const before = await snapshotDirs(host.dirs);

    // A login shell resolves the interpreter to the venv, not the host.
    const which = await sh("command -v python3");
    assertEquals(
      await Deno.realPath(which.out.trim()),
      await Deno.realPath(join(install.venvBin, "python3")),
      "a login shell must still put the sandbox venv first",
    );

    const viaPip = await sh(`pip install --no-index --quiet ${wheel}`);
    assertEquals(viaPip.code, 0, viaPip.out);
    const viaModule = await sh(
      `python3 -m pip install --no-index --quiet --force-reinstall ${wheel}`,
    );
    assertEquals(viaModule.code, 0, viaModule.out);
    const landed = await sh(
      `python3 -c "import flowai_bench_probe, sys; print(flowai_bench_probe.__file__)"`,
    );
    assert(
      landed.out.includes(join(VENV_DIR, "lib")),
      `the probe must land in the sandbox venv: ${landed.out}`,
    );

    // The host interpreter by absolute path, with the PEP 668 override an
    // agent reaches for after "externally-managed-environment".
    const escape = await sh(
      `${host.python} -m pip install --break-system-packages --no-index ${wheel}`,
    );
    assert(escape.code !== 0, `host pip must refuse: ${escape.out}`);
    assertStringIncludes(escape.out, "virtualenv (required)");

    assertEquals(
      await snapshotDirs(host.dirs),
      before,
      "the host site-packages must not change",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
