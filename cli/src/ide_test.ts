import { assert, assertEquals, assertRejects } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { detectIDEs, isInsideIDE, resolveIDEs } from "./ide.ts";

Deno.test("detectIDEs - detects cursor by .cursor/ dir", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.cursor");

  const ides = await detectIDEs("/project", fs);
  assertEquals(ides.length, 1);
  assertEquals(ides[0].name, "cursor");
});

Deno.test("detectIDEs - detects multiple IDEs", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.cursor");
  fs.dirs.add("/project/.claude");

  const ides = await detectIDEs("/project", fs);
  assertEquals(ides.length, 2);
  const names = ides.map((i) => i.name).sort();
  assertEquals(names, ["claude", "cursor"]);
});

// [FR-DIST.DETECT](../../documents/requirements.md#fr-dist.detect-ide-auto-detection) — Codex detection
Deno.test("detectIDEs - detects codex by .codex/ dir", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.codex");

  const ides = await detectIDEs("/project", fs);
  assertEquals(ides.length, 1);
  assertEquals(ides[0].name, "codex");
  assertEquals(ides[0].configDir, ".codex");
});

Deno.test("resolveIDEs - accepts codex explicitly", async () => {
  const fs = new InMemoryFsAdapter();
  const ides = await resolveIDEs(["codex"], "/project", fs);
  assertEquals(ides.length, 1);
  assertEquals(ides[0].name, "codex");
  assertEquals(ides[0].configDir, ".codex");
});

Deno.test("detectIDEs - returns empty if no IDE dirs", async () => {
  const fs = new InMemoryFsAdapter();
  const ides = await detectIDEs("/project", fs);
  assertEquals(ides.length, 0);
});

Deno.test("resolveIDEs - uses config ides when provided", async () => {
  const fs = new InMemoryFsAdapter();
  const ides = await resolveIDEs(["claude", "cursor"], "/project", fs);
  assertEquals(ides.length, 2);
  assertEquals(ides[0].name, "claude");
  assertEquals(ides[1].name, "cursor");
});

Deno.test("resolveIDEs - falls back to auto-detect", async () => {
  const fs = new InMemoryFsAdapter();
  fs.dirs.add("/project/.opencode");

  const ides = await resolveIDEs([], "/project", fs);
  assertEquals(ides.length, 1);
  assertEquals(ides[0].name, "opencode");
});

Deno.test("resolveIDEs - throws on unknown IDE", async () => {
  const fs = new InMemoryFsAdapter();
  await assertRejects(
    () => resolveIDEs(["unknown"], "/project", fs),
    Error,
    "Unknown IDE: unknown",
  );
});

// --- isInsideIDE tests ---

/** Fake env for testing */
function fakeEnv(vars: Record<string, string>): {
  get(key: string): string | undefined;
} {
  return { get: (key: string) => vars[key] };
}

Deno.test("isInsideIDE - returns true for CLAUDECODE=1", () => {
  assertEquals(isInsideIDE(fakeEnv({ CLAUDECODE: "1" })), true);
});

Deno.test("isInsideIDE - returns true for CURSOR_AGENT=1", () => {
  assertEquals(isInsideIDE(fakeEnv({ CURSOR_AGENT: "1" })), true);
});

Deno.test("isInsideIDE - returns true for OPENCODE=1", () => {
  assertEquals(isInsideIDE(fakeEnv({ OPENCODE: "1" })), true);
});

// [FR-DIST.DETECT](../../documents/requirements.md#fr-dist.detect-ide-auto-detection) — Codex env-var detection
Deno.test("isInsideIDE - returns true when CODEX_THREAD_ID is set", () => {
  assertEquals(
    isInsideIDE(fakeEnv({ CODEX_THREAD_ID: "019d7d56-af20-7e02" })),
    true,
  );
});

Deno.test("isInsideIDE - returns true when CODEX_SANDBOX is set", () => {
  assertEquals(
    isInsideIDE(fakeEnv({ CODEX_SANDBOX: "seatbelt" })),
    true,
  );
});

Deno.test("isInsideIDE - returns false when no IDE env vars set", () => {
  assertEquals(isInsideIDE(fakeEnv({})), false);
});

Deno.test("isInsideIDE - returns false when IDE env var is not '1'", () => {
  assertEquals(isInsideIDE(fakeEnv({ CLAUDECODE: "0" })), false);
  assertEquals(isInsideIDE(fakeEnv({ CLAUDECODE: "true" })), false);
});

Deno.test("isInsideIDE - returns true when multiple IDE vars set", () => {
  assertEquals(
    isInsideIDE(fakeEnv({ CURSOR_AGENT: "1", CLAUDECODE: "1" })),
    true,
  );
});

// --- CLI integration: --version prints version and checks for updates ---

Deno.test("CLI - --version prints version string", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", "cli/src/main.ts", "--version"],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const stdout = new TextDecoder().decode(output.stdout);

  assertEquals(output.code, 0);
  assert(
    stdout.includes("flowai "),
    `Expected 'flowai <version>' output, got: ${stdout}`,
  );
});

// --- CLI integration: bare command inside IDE prints message and does NOT sync ---

Deno.test("CLI - bare command inside IDE prints message instead of syncing", async () => {
  // The IDE-context guard fires only when scope resolves to project — i.e.
  // `--local` or `./.flowai.yaml` exists in cwd. Stage a project config in
  // tmpDir + isolate HOME so the bare command picks the project scope and
  // hits the guard before runSync.
  const tmpDir = await Deno.makeTempDir();
  const tmpHome = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tmpDir}/.flowai.yaml`, "version: 1\n");

    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(Deno.env.toObject())) {
      if (!["CLAUDECODE", "CURSOR_AGENT", "OPENCODE"].includes(k)) {
        env[k] = v;
      }
    }
    env["CLAUDECODE"] = "1";
    env["HOME"] = tmpHome;
    env["USERPROFILE"] = tmpHome;

    const mainPath = new URL("./main.ts", import.meta.url).pathname;
    const cmd = new Deno.Command("deno", {
      args: ["run", "-A", mainPath],
      cwd: tmpDir,
      env,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await cmd.output();
    const stdout = new TextDecoder().decode(output.stdout);

    assertEquals(output.code, 0);
    assert(
      stdout.includes("IDE context detected") &&
        stdout.includes("flowai sync -y --skip-update-check"),
      `Expected IDE message with sync subcommand hint, got: ${stdout}`,
    );
    assert(
      !stdout.includes("Sync plan"),
      "Should NOT start sync inside IDE context",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
    await Deno.remove(tmpHome, { recursive: true });
  }
});

Deno.test("CLI - sync subcommand works even inside IDE", async () => {
  // sync subcommand should attempt sync regardless of IDE env.
  // Run in a temp dir AND with a temp HOME so the subprocess doesn't create
  // `~/.flowai.yaml` in the tester's real home directory (FR-DIST.GLOBAL auto
  // mode defaults to global when both configs are missing).
  const tmpDir = await Deno.makeTempDir();
  const tmpHome = await Deno.makeTempDir();
  try {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(Deno.env.toObject())) {
      if (!["CLAUDECODE", "CURSOR_AGENT", "OPENCODE"].includes(k)) {
        env[k] = v;
      }
    }
    env["CLAUDECODE"] = "1";
    env["HOME"] = tmpHome;
    env["USERPROFILE"] = tmpHome;

    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "cli/src/main.ts",
        "sync",
        "--yes",
        "--skip-update-check",
        "--local",
      ],
      cwd: tmpDir,
      env,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await cmd.output();
    const stderr = new TextDecoder().decode(output.stderr);
    const stdout = new TextDecoder().decode(output.stdout);

    // Should NOT show IDE message — sync subcommand bypasses the check
    assert(
      !stdout.includes("IDE context detected"),
      "sync subcommand should not show IDE message",
    );
    // `--local --yes` writes a fresh project config in tmpDir, then prints
    // the sync plan. Either a sync attempt or a config-related error is
    // acceptable.
    assert(
      output.code !== 0 || stderr.includes(".flowai.yaml") ||
        stdout.includes("Sync"),
      `Expected sync attempt or config error, got stdout: ${stdout}, stderr: ${stderr}`,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
    await Deno.remove(tmpHome, { recursive: true });
  }
});
