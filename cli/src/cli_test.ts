import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import {
  formatSyncPlan,
  renderSyncOutput,
  resolveEffectiveScope,
} from "./cli.ts";
import type { SyncResult } from "./sync.ts";
import type { FlowConfig } from "./types.ts";

/** Capture console.log output during a function call */
function captureOutput(fn: () => void): string {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    fn();
  } finally {
    console.log = orig;
  }
  return lines.join("\n");
}

function baseSyncResult(): SyncResult {
  return {
    totalWritten: 0,
    totalSkipped: 0,
    totalDeleted: 0,
    totalConflicts: 0,
    errors: [],
    skillActions: [],
    agentActions: [],
    hookActions: [],
    assetActions: [],
  };
}

Deno.test("renderSyncOutput - no actions when all ok", () => {
  const result = baseSyncResult();
  result.skillActions = [
    { name: "flowai-commit", action: "ok", scaffolds: [] },
    { name: "flowai-plan", action: "ok", scaffolds: [] },
  ];
  result.agentActions = [
    { name: "console-expert", action: "ok", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, ">>> NO ACTIONS REQUIRED");
  assertStringIncludes(output, "2 skills unchanged");
  assertStringIncludes(output, "1 agents unchanged");
  assert(!output.includes(">>> ACTIONS REQUIRED:"));
});

Deno.test("renderSyncOutput - shows config migration action", () => {
  const result = baseSyncResult();
  result.configMigrated = {
    from: "1.0",
    to: "1.1",
    packs: ["core", "deno"],
  };
  result.skillActions = [
    { name: "flowai-commit", action: "ok", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, ">>> ACTIONS REQUIRED:");
  assertStringIncludes(output, "CONFIG MIGRATED");
  assertStringIncludes(output, "v1.0 -> v1.1");
  assertStringIncludes(output, "core, deno");
  assertStringIncludes(output, "Commit this file");
});

Deno.test("renderSyncOutput - shows updated skills with scaffolds", () => {
  const result = baseSyncResult();
  result.skillActions = [
    {
      name: "flowai-init",
      action: "update",
      scaffolds: ["AGENTS.md"],
    },
    { name: "flowai-commit", action: "update", scaffolds: [] },
    { name: "flowai-plan", action: "ok", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, ">>> ACTIONS REQUIRED:");
  assertStringIncludes(output, "SKILLS UPDATED (2)");
  assertStringIncludes(
    output,
    "flowai-init (scaffolds: AGENTS.md)",
  );
  assertStringIncludes(output, "flowai-commit");
  assertStringIncludes(output, "compare the updated template");
});

Deno.test("renderSyncOutput - shows created and deleted skills", () => {
  const result = baseSyncResult();
  result.skillActions = [
    { name: "flowai-new", action: "create", scaffolds: [] },
    { name: "flowai-old", action: "delete", scaffolds: ["AGENTS.md"] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "SKILLS CREATED (1)");
  assertStringIncludes(output, "flowai-new");
  assertStringIncludes(output, "SKILLS DELETED (1)");
  assertStringIncludes(output, "flowai-old");
});

Deno.test("renderSyncOutput - shows agent updates", () => {
  const result = baseSyncResult();
  result.agentActions = [
    { name: "console-expert", action: "update", scaffolds: [] },
    { name: "diff-specialist", action: "ok", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "AGENTS UPDATED (1)");
  assertStringIncludes(output, "console-expert");
});

Deno.test("renderSyncOutput - shows created agents", () => {
  const result = baseSyncResult();
  result.agentActions = [
    { name: "new-agent", action: "create", scaffolds: [] },
    { name: "another-new", action: "create", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "AGENTS CREATED (2)");
  assertStringIncludes(output, "new-agent");
  assertStringIncludes(output, "another-new");
});

Deno.test("renderSyncOutput - shows deleted agents", () => {
  const result = baseSyncResult();
  result.agentActions = [
    { name: "old-agent", action: "delete", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "AGENTS DELETED (1)");
  assertStringIncludes(output, "old-agent");
});

Deno.test("renderSyncOutput - shows deleted hooks", () => {
  const result = baseSyncResult();
  result.hookActions = [
    { name: "old-hook", action: "delete", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "HOOKS DELETED (1)");
  assertStringIncludes(output, "old-hook");
});

Deno.test("renderSyncOutput - shows updated assets with artifacts", () => {
  const result = baseSyncResult();
  result.assetActions = [
    {
      name: "AGENTS.template.md",
      action: "update",
      scaffolds: ["AGENTS.md"],
    },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, ">>> ACTIONS REQUIRED:");
  assertStringIncludes(output, "ASSETS UPDATED (1)");
  assertStringIncludes(output, "AGENTS.template.md (artifacts: AGENTS.md)");
  assertStringIncludes(output, "compare the template");
});

Deno.test("renderSyncOutput - shows created assets", () => {
  const result = baseSyncResult();
  result.assetActions = [
    {
      name: "NEW.template.md",
      action: "create",
      scaffolds: ["NEW.md"],
    },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, "ASSETS CREATED (1)");
  assertStringIncludes(output, "NEW.template.md (artifacts: NEW.md)");
});

// --- UX improvements: errors, header, counters, color ---

Deno.test("renderSyncOutput - errors rendered as final block, not inside ACTIONS REQUIRED", () => {
  const result = baseSyncResult();
  result.skillActions = [
    { name: "good", action: "create", scaffolds: [] },
  ];
  result.errors = [
    { path: "/ide/skills/bad/SKILL.md", error: "EEXIST" },
  ];

  const output = captureOutput(() =>
    renderSyncOutput(result, { color: false })
  );

  const actionsIdx = output.indexOf(">>> ACTIONS REQUIRED:");
  const errorsIdx = output.indexOf(">>> ERRORS (");
  assert(actionsIdx >= 0, "ACTIONS REQUIRED block must be present");
  assert(errorsIdx > actionsIdx, "ERRORS block must appear after ACTIONS");
  assertEquals(
    output.match(/\d+\. ERRORS/g),
    null,
    "ERRORS must NOT appear as numbered item in ACTIONS list",
  );
  assertStringIncludes(output, ">>> ERRORS (1):");
  assertStringIncludes(output, "/ide/skills/bad/SKILL.md: EEXIST");
});

Deno.test("renderSyncOutput - header says FAILED when errors present", () => {
  const result = baseSyncResult();
  result.errors = [{ path: "/x", error: "bad" }];

  const output = captureOutput(() =>
    renderSyncOutput(result, { color: false })
  );
  assertStringIncludes(output, "flowai sync FAILED: 1 error(s).");
  assert(
    !output.includes("flowai sync complete."),
    "must not print 'complete' when errors present",
  );
});

Deno.test("renderSyncOutput - header says complete when no errors", () => {
  const result = baseSyncResult();
  result.skillActions = [
    { name: "ok-skill", action: "ok", scaffolds: [] },
  ];
  const output = captureOutput(() =>
    renderSyncOutput(result, { color: false })
  );
  assertStringIncludes(output, "flowai sync complete.");
});

Deno.test("renderSyncOutput - partial write shows written/planned counter", () => {
  const result = baseSyncResult();
  result.skillActions = [
    { name: "good1", action: "create", scaffolds: [] },
    { name: "good2", action: "create", scaffolds: [] },
    { name: "bad1", action: "create", scaffolds: [], failed: true },
  ];
  result.errors = [
    { path: "/skills/bad1/SKILL.md", error: "EEXIST" },
  ];

  const output = captureOutput(() =>
    renderSyncOutput(result, { color: false })
  );
  assertStringIncludes(output, "SKILLS CREATED (2/3):");
  assertStringIncludes(output, "good1");
  assertStringIncludes(output, "good2");

  // failed item must not appear in the CREATED list (above ERRORS)
  const createdIdx = output.indexOf("SKILLS CREATED");
  const errorsIdx = output.indexOf(">>> ERRORS");
  assert(createdIdx >= 0 && errorsIdx > createdIdx);
  const createdBlock = output.substring(createdIdx, errorsIdx);
  assert(
    !createdBlock.includes("bad1"),
    "failed item must NOT appear in CREATED list",
  );
  assertStringIncludes(output, "/skills/bad1/SKILL.md: EEXIST");
});

Deno.test("renderSyncOutput - ANSI red for header and errors when color=true", () => {
  const result = baseSyncResult();
  result.errors = [{ path: "/x", error: "bad" }];

  const output = captureOutput(() => renderSyncOutput(result, { color: true }));
  assertStringIncludes(output, "\x1b[31m");
  assertStringIncludes(output, "\x1b[0m");
});

Deno.test("renderSyncOutput - no ANSI codes when color=false", () => {
  const result = baseSyncResult();
  result.errors = [{ path: "/x", error: "bad" }];
  result.skillActions = [{ name: "s", action: "create", scaffolds: [] }];

  const output = captureOutput(() =>
    renderSyncOutput(result, { color: false })
  );
  assert(!output.includes("\x1b["), "must not contain ANSI escapes");
});

// --- formatSyncPlan: project vs global preview ---

function baseConfig(overrides: Partial<FlowConfig> = {}): FlowConfig {
  return {
    version: "1.1",
    ides: ["claude", "cursor"],
    packs: ["core"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
    ...overrides,
  };
}

Deno.test("formatSyncPlan - global mode lists resolved Target dirs", () => {
  const config = baseConfig({
    ides: ["claude", "cursor", "opencode", "codex"],
  });
  const text = formatSyncPlan(config, { scope: "global", home: "/home/u" });
  assertStringIncludes(text, "Target dirs:");
  assertStringIncludes(text, "/home/u/.claude");
  assertStringIncludes(text, "/home/u/.cursor");
  assertStringIncludes(text, "/home/u/.config/opencode");
  // Codex in global mode splits skills + agents
  assertStringIncludes(text, "/home/u/.codex");
  assertStringIncludes(text, "/home/u/.agents");
});

Deno.test("formatSyncPlan - project mode does NOT list global Target dirs block", () => {
  const config = baseConfig({ ides: ["claude", "cursor"] });
  const text = formatSyncPlan(config, { scope: "project", home: "" });
  assert(
    !text.includes("Target dirs:"),
    "project mode omits Target dirs block",
  );
  assertStringIncludes(text, "IDEs: claude, cursor");
});

// --- resolveEffectiveScope (FR-DIST.GLOBAL three-mode flow) ---

Deno.test("resolveEffectiveScope - --global forces global without probing FS", async () => {
  const fs = new InMemoryFsAdapter();
  // Project config would normally win in auto, but --global must bypass.
  fs.files.set("/project/.flowai.yaml", "version: '1.1'\nides: [claude]\n");
  const r = await resolveEffectiveScope("global", "/project", "/home/u", fs);
  assertEquals(r.scope, "global");
  assertEquals(r.needsPrompt, false);
  assertEquals(r.autoUsedGlobal, false);
});

Deno.test("resolveEffectiveScope - --local forces project", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/home/u/.flowai.yaml", "version: '1.1'\nides: [cursor]\n");
  const r = await resolveEffectiveScope("local", "/project", "/home/u", fs);
  assertEquals(r.scope, "project");
  assertEquals(r.needsPrompt, false);
});

Deno.test("resolveEffectiveScope - auto: project config wins", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.flowai.yaml", "version: '1.1'\nides: [claude]\n");
  fs.files.set("/home/u/.flowai.yaml", "version: '1.1'\nides: [cursor]\n");
  const r = await resolveEffectiveScope("auto", "/project", "/home/u", fs);
  assertEquals(r.scope, "project");
  assertEquals(r.autoUsedGlobal, false);
});

Deno.test("resolveEffectiveScope - auto: falls back to global with flag set", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/home/u/.flowai.yaml", "version: '1.1'\nides: [cursor]\n");
  const r = await resolveEffectiveScope("auto", "/project", "/home/u", fs);
  assertEquals(r.scope, "global");
  assertEquals(r.needsPrompt, false);
  assertEquals(r.autoUsedGlobal, true);
});

Deno.test("resolveEffectiveScope - auto: both missing signals needsPrompt", async () => {
  const fs = new InMemoryFsAdapter();
  const r = await resolveEffectiveScope("auto", "/project", "/home/u", fs);
  assertEquals(r.scope, "global");
  assertEquals(r.needsPrompt, true);
  assertEquals(r.autoUsedGlobal, false);
});

// --- CLI integration: scope flag validation ---

Deno.test("CLI - --global + --local exits 1 with clear error", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    // Use absolute path to main.ts so the temp cwd doesn't break resolution.
    const mainPath = new URL("./main.ts", import.meta.url).pathname;
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        mainPath,
        "sync",
        "--yes",
        "--skip-update-check",
        "--global",
        "--local",
      ],
      cwd: tmp,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await cmd.output();
    const stderr = new TextDecoder().decode(output.stderr);
    assertEquals(output.code, 1);
    assertStringIncludes(stderr, "mutually exclusive");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("CLI - migrate without scope flag exits 1", async () => {
  const cmd = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "cli/src/main.ts",
      "migrate",
      "claude",
      "cursor",
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const stderr = new TextDecoder().decode(output.stderr);
  assertEquals(output.code, 1);
  assertStringIncludes(stderr, "explicit scope");
});

Deno.test("CLI - migrate with --global + --local exits 1", async () => {
  const cmd = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "cli/src/main.ts",
      "migrate",
      "claude",
      "cursor",
      "--global",
      "--local",
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const stderr = new TextDecoder().decode(output.stderr);
  assertEquals(output.code, 1);
  assertStringIncludes(stderr, "mutually exclusive");
});
