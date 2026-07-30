import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
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
