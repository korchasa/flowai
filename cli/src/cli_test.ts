import { assert, assertStringIncludes } from "@std/assert";
import { renderSyncOutput } from "./cli.ts";
import type { SyncResult } from "./sync.ts";

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
      scaffolds: ["AGENTS.md", "documents/AGENTS.md"],
    },
    { name: "flowai-commit", action: "update", scaffolds: [] },
    { name: "flowai-plan", action: "ok", scaffolds: [] },
  ];

  const output = captureOutput(() => renderSyncOutput(result));
  assertStringIncludes(output, ">>> ACTIONS REQUIRED:");
  assertStringIncludes(output, "SKILLS UPDATED (2)");
  assertStringIncludes(
    output,
    "flowai-init (scaffolds: AGENTS.md, documents/AGENTS.md)",
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
