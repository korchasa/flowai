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

// --- CLI integration: bare command inside IDE prints message and does NOT sync ---

Deno.test("CLI - bare command inside IDE prints message instead of syncing", async () => {
  // Strip all IDE env vars, then set CLAUDECODE=1
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(Deno.env.toObject())) {
    if (!["CLAUDECODE", "CURSOR_AGENT", "OPENCODE"].includes(k)) {
      env[k] = v;
    }
  }
  env["CLAUDECODE"] = "1";

  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", "cli/src/main.ts"],
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
});

Deno.test("CLI - sync subcommand works even inside IDE", async () => {
  // sync subcommand should attempt sync regardless of IDE env
  // It will fail because no .flowai.yaml + --yes, but it should NOT print the IDE message
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(Deno.env.toObject())) {
    if (!["CLAUDECODE", "CURSOR_AGENT", "OPENCODE"].includes(k)) {
      env[k] = v;
    }
  }
  env["CLAUDECODE"] = "1";

  const cmd = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "cli/src/main.ts",
      "sync",
      "--yes",
      "--skip-update-check",
    ],
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
  // Will fail with "No .flowai.yaml" since --yes requires config
  assert(
    output.code !== 0 || stderr.includes(".flowai.yaml") ||
      stdout.includes("Sync"),
    `Expected sync attempt or config error, got stdout: ${stdout}, stderr: ${stderr}`,
  );
});
