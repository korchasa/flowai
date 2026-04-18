import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import {
  resolveAutoScope,
  resolveConfigPath,
  resolveHomeDir,
  resolveIdeBaseDir,
  resolveScope,
  resolveScopeMode,
} from "./scope.ts";

// --- resolveScope ---

Deno.test("resolveScope - default is project", () => {
  assertEquals(resolveScope({}), "project");
  assertEquals(resolveScope({ global: false }), "project");
});

Deno.test("resolveScope - --global flag yields global", () => {
  assertEquals(resolveScope({ global: true }), "global");
});

// --- resolveConfigPath ---

Deno.test("resolveConfigPath - project mode returns cwd/.flowai.yaml", () => {
  assertEquals(
    resolveConfigPath("project", "/project", "/home/user"),
    "/project/.flowai.yaml",
  );
});

// FR-DIST.CONFIG — global mode
Deno.test("resolveConfigPath global mode returns home/.flowai.yaml", () => {
  assertEquals(
    resolveConfigPath("global", "/project", "/home/user"),
    "/home/user/.flowai.yaml",
  );
});

// --- resolveIdeBaseDir: project mode ---

Deno.test("resolveIdeBaseDir - project mode returns cwd/<configDir>", () => {
  assertEquals(
    resolveIdeBaseDir("claude", "project", "/project", "/home/user"),
    "/project/.claude",
  );
  assertEquals(
    resolveIdeBaseDir("cursor", "project", "/project", "/home/user"),
    "/project/.cursor",
  );
  assertEquals(
    resolveIdeBaseDir("opencode", "project", "/project", "/home/user"),
    "/project/.opencode",
  );
  assertEquals(
    resolveIdeBaseDir("codex", "project", "/project", "/home/user"),
    "/project/.codex",
  );
});

Deno.test("resolveIdeBaseDir - project mode ignores purpose", () => {
  assertEquals(
    resolveIdeBaseDir("codex", "project", "/project", "/home/user", "skills"),
    "/project/.codex",
  );
  assertEquals(
    resolveIdeBaseDir("codex", "project", "/project", "/home/user", "agents"),
    "/project/.codex",
  );
});

// --- resolveIdeBaseDir: global mode ---

// FR-DIST.GLOBAL — IDE base dirs per IDE
Deno.test("resolveIDEs global mode returns correct paths per IDE", () => {
  const home = "/home/user";
  assertEquals(
    resolveIdeBaseDir("claude", "global", "/project", home),
    "/home/user/.claude",
  );
  assertEquals(
    resolveIdeBaseDir("cursor", "global", "/project", home),
    "/home/user/.cursor",
  );
  assertEquals(
    resolveIdeBaseDir("opencode", "global", "/project", home),
    "/home/user/.config/opencode",
  );
  // Codex agents → ~/.codex/
  assertEquals(
    resolveIdeBaseDir("codex", "global", "/project", home, "agents"),
    "/home/user/.codex",
  );
  // Codex skills → ~/.agents/
  assertEquals(
    resolveIdeBaseDir("codex", "global", "/project", home, "skills"),
    "/home/user/.agents",
  );
  // Codex default (no purpose) → agents path (.codex/)
  assertEquals(
    resolveIdeBaseDir("codex", "global", "/project", home),
    "/home/user/.codex",
  );
});

Deno.test("resolveIdeBaseDir - unknown IDE throws", () => {
  assertThrows(
    () => resolveIdeBaseDir("vim", "project", "/project", "/home/user"),
    Error,
    "Unknown IDE",
  );
  assertThrows(
    () => resolveIdeBaseDir("vim", "global", "/project", "/home/user"),
    Error,
    "Unknown IDE",
  );
});

// --- resolveHomeDir ---

Deno.test("resolveHomeDir - reads HOME on Unix", () => {
  const env = {
    get: (k: string) => (k === "HOME" ? "/home/alice" : undefined),
  };
  assertEquals(resolveHomeDir(env), "/home/alice");
});

Deno.test("resolveHomeDir - falls back to USERPROFILE", () => {
  const env = {
    get: (k: string) => k === "USERPROFILE" ? "C:\\Users\\alice" : undefined,
  };
  assertEquals(resolveHomeDir(env), "C:\\Users\\alice");
});

Deno.test("resolveHomeDir - throws when neither is set", () => {
  const env = { get: (_k: string) => undefined };
  assertThrows(
    () => resolveHomeDir(env),
    Error,
    "Cannot resolve home directory",
  );
});

// --- resolveScopeMode ---

Deno.test("resolveScopeMode - no flags yields auto", () => {
  assertEquals(resolveScopeMode({}), "auto");
  assertEquals(resolveScopeMode({ global: false, local: false }), "auto");
});

Deno.test("resolveScopeMode - --global yields global", () => {
  assertEquals(resolveScopeMode({ global: true }), "global");
});

Deno.test("resolveScopeMode - --local yields local", () => {
  assertEquals(resolveScopeMode({ local: true }), "local");
});

Deno.test("resolveScopeMode - --global + --local throws", () => {
  assertThrows(
    () => resolveScopeMode({ global: true, local: true }),
    Error,
    "mutually exclusive",
  );
});

// --- resolveAutoScope ---

Deno.test("resolveAutoScope - project config present wins", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.flowai.yaml", "version: '1.1'\nides: [claude]\n");
  const result = await resolveAutoScope("/project", "/home/user", fs);
  assertEquals(result, "project");
});

Deno.test(
  "resolveAutoScope - project missing, global present → global",
  async () => {
    const fs = new InMemoryFsAdapter();
    fs.files.set(
      "/home/user/.flowai.yaml",
      "version: '1.1'\nides: [claude]\n",
    );
    const result = await resolveAutoScope("/project", "/home/user", fs);
    assertEquals(result, "global");
  },
);

Deno.test("resolveAutoScope - both configs present → project wins", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.flowai.yaml", "version: '1.1'\nides: [claude]\n");
  fs.files.set(
    "/home/user/.flowai.yaml",
    "version: '1.1'\nides: [cursor]\n",
  );
  const result = await resolveAutoScope("/project", "/home/user", fs);
  assertEquals(result, "project");
});

Deno.test("resolveAutoScope - both missing → null", async () => {
  const fs = new InMemoryFsAdapter();
  const result = await resolveAutoScope("/project", "/home/user", fs);
  assertEquals(result, null);
});

// Ensure the function uses the fs adapter (never talks to real disk)
Deno.test("resolveAutoScope - isolated from real filesystem", async () => {
  const fs = new InMemoryFsAdapter();
  // Even with cwd set to a definitely-real path with a likely .flowai.yaml,
  // an empty adapter must return null.
  const result = await resolveAutoScope(
    "/nonexistent-sandbox",
    "/home/ghost",
    fs,
  );
  assertEquals(result, null);
  // Compile-time guard: function returns a promise we can still reject on bad input.
  await assertRejects(
    () =>
      resolveAutoScope(
        "/project",
        "/home/user",
        null as unknown as InMemoryFsAdapter,
      ),
    Error,
  );
});
