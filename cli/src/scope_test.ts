import { assertEquals, assertThrows } from "@std/assert";
import {
  resolveConfigPath,
  resolveHomeDir,
  resolveIdeBaseDir,
  resolveScope,
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
