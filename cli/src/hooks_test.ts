import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildManifest,
  cleanupRemovedHooks,
  generateOpenCodePlugin,
  mergeClaudeHooks,
  mergeCursorHooks,
  readManifest,
  resolveTimeout,
  transformHookForClaude,
  transformHookForCursor,
  transformMatcher,
} from "./hooks.ts";
import type { HookDefinition } from "./types.ts";

// --- resolveTimeout ---

Deno.test("resolveTimeout: PostToolUse default is 30", () => {
  assertEquals(resolveTimeout({ event: "PostToolUse", description: "" }), 30);
});

Deno.test("resolveTimeout: PreToolUse default is 600", () => {
  assertEquals(resolveTimeout({ event: "PreToolUse", description: "" }), 600);
});

Deno.test("resolveTimeout: explicit timeout overrides default", () => {
  assertEquals(
    resolveTimeout({ event: "PostToolUse", description: "", timeout: 15 }),
    15,
  );
});

// --- transformMatcher ---

Deno.test("transformMatcher: cursor transforms Edit to StrReplace", () => {
  assertEquals(transformMatcher("Write|Edit", "cursor"), "Write|StrReplace");
});

Deno.test("transformMatcher: unknown tool passes through", () => {
  assertEquals(transformMatcher("UnknownTool", "cursor"), "UnknownTool");
});

Deno.test("transformMatcher: claude no transform", () => {
  assertEquals(transformMatcher("Write|Edit", "claude"), "Write|Edit");
});

Deno.test("transformMatcher: opencode transforms", () => {
  assertEquals(
    transformMatcher("Write|Edit|Bash", "opencode"),
    "write|edit|bash",
  );
});

// --- transformHookForClaude ---

Deno.test("transformHookForClaude: generates correct structure", () => {
  const hook: HookDefinition = {
    event: "PostToolUse",
    matcher: "Write|Edit",
    description: "Auto-lint",
    timeout: 30,
  };
  const result = transformHookForClaude(
    hook,
    ".claude/scripts/flowai-test-hook/run.ts",
  );
  assertEquals(result.event, "PostToolUse");
  assertEquals(result.matcher, "Write|Edit");
  assertEquals(result.hooks.length, 1);
  assertEquals(result.hooks[0].type, "command");
  assertStringIncludes(result.hooks[0].command, "deno run -A");
  assertStringIncludes(result.hooks[0].command, "flowai-test-hook/run.ts");
  assertEquals(result.hooks[0].timeout, 30);
});

Deno.test("transformHookForClaude: no matcher if undefined", () => {
  const hook: HookDefinition = {
    event: "PreToolUse",
    description: "test",
  };
  const result = transformHookForClaude(hook, ".claude/scripts/test/run.ts");
  assertEquals(result.matcher, undefined);
});

// --- transformHookForCursor ---

Deno.test("transformHookForCursor: transforms event and matcher", () => {
  const hook: HookDefinition = {
    event: "PostToolUse",
    matcher: "Write|Edit",
    description: "Auto-lint",
    timeout: 30,
  };
  const result = transformHookForCursor(
    hook,
    ".cursor/scripts/flowai-test-hook/run.ts",
  );
  assertEquals(result.event, "postToolUse");
  assertEquals(result.matcher, "Write|StrReplace");
  assertEquals(result.type, "command");
  assertEquals(result.timeout, 30);
  assertStringIncludes(result.command, "deno run -A");
});

Deno.test("transformHookForCursor: maps SessionStart event", () => {
  const hook: HookDefinition = {
    event: "SessionStart",
    description: "Lint on write",
    timeout: 10,
  };
  const result = transformHookForCursor(
    hook,
    ".cursor/scripts/flowai-test-hook/run.ts",
  );
  assertEquals(result.event, "sessionStart");
  assertEquals(result.matcher, undefined);
  assertEquals(result.timeout, 10);
});

// --- generateOpenCodePlugin ---

Deno.test("generateOpenCodePlugin: contains expected content", () => {
  const hooks = [
    {
      name: "flowai-test-hook",
      hook: {
        event: "PostToolUse",
        matcher: "Write|Edit",
        description: "Auto-lint",
      } as HookDefinition,
      scriptPath: ".opencode/scripts/flowai-test-hook/run.ts",
    },
  ];
  const result = generateOpenCodePlugin(hooks);
  assertStringIncludes(result, "tool.execute.after");
  assertStringIncludes(result, "deno run -A");
  assertStringIncludes(result, "flowai-test-hook/run.ts");
  assertStringIncludes(result, "satisfies Plugin");
});

Deno.test("generateOpenCodePlugin: SessionStart uses event handler", () => {
  const hooks = [
    {
      name: "flowai-session-init",
      hook: {
        event: "SessionStart",
        description: "Session init",
      } as HookDefinition,
      scriptPath: ".opencode/scripts/flowai-session-init/run.ts",
    },
  ];
  const result = generateOpenCodePlugin(hooks);
  // Must use the `event` hook, not a top-level "session.created" property
  assertStringIncludes(result, "event: async");
  assertStringIncludes(result, '"session.created"');
  assertStringIncludes(result, "flowai-session-init/run.ts");
  assertStringIncludes(result, "satisfies Plugin");
  // Must NOT generate a top-level "session.created" key (that's not a valid plugin hook)
  assertEquals(result.includes('"session.created": async (output)'), false);
});

Deno.test("generateOpenCodePlugin: mixed tool hooks and SessionStart", () => {
  const hooks = [
    {
      name: "flowai-lint",
      hook: {
        event: "PostToolUse",
        matcher: "Write|Edit",
        description: "Auto-lint",
      } as HookDefinition,
      scriptPath: ".opencode/scripts/flowai-lint/run.ts",
    },
    {
      name: "flowai-session-init",
      hook: {
        event: "SessionStart",
        description: "Session init",
      } as HookDefinition,
      scriptPath: ".opencode/scripts/flowai-session-init/run.ts",
    },
  ];
  const result = generateOpenCodePlugin(hooks);
  // Tool hook as top-level property
  assertStringIncludes(result, '"tool.execute.after"');
  assertStringIncludes(result, "flowai-lint/run.ts");
  // Lifecycle event via event handler
  assertStringIncludes(result, "event: async");
  assertStringIncludes(result, '"session.created"');
  assertStringIncludes(result, "flowai-session-init/run.ts");
});

// --- mergeClaudeHooks ---

Deno.test("mergeClaudeHooks: adds new hooks preserving user hooks", () => {
  const existing = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Custom",
          hooks: [{ type: "command", command: "user-hook.sh", timeout: 10 }],
        },
      ],
    },
  };
  const newHooks = [
    {
      event: "PostToolUse",
      matcher: "Write|Edit",
      hooks: [
        {
          type: "command" as const,
          command: "deno run -A .claude/scripts/flowai-test-hook/run.ts",
          timeout: 30,
        },
      ],
    },
  ];
  const manifest = { version: 1, hooks: {} };
  const result = mergeClaudeHooks(existing, newHooks, manifest);
  const postHooks = (result.hooks as Record<string, unknown[]>).PostToolUse;
  assertEquals(postHooks.length, 2); // user + flowai
});

Deno.test("mergeClaudeHooks: replaces old flowai hooks", () => {
  const existing = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Write|Edit",
          hooks: [
            {
              type: "command",
              command: "deno run -A .claude/scripts/flowai-test-hook/run.ts",
              timeout: 30,
            },
          ],
        },
      ],
    },
  };
  const newHooks = [
    {
      event: "PostToolUse",
      matcher: "Write|Edit",
      hooks: [
        {
          type: "command" as const,
          command: "deno run -A .claude/scripts/flowai-test-hook/run.ts",
          timeout: 60,
        },
      ],
    },
  ];
  const manifest = {
    version: 1,
    hooks: {
      "flowai-test-hook": {
        event: "PostToolUse",
        matcher: "Write|Edit",
        installedAt: "2026-01-01T00:00:00Z",
      },
    },
  };
  const result = mergeClaudeHooks(existing, newHooks, manifest);
  const postHooks = (result.hooks as Record<string, unknown[]>)
    .PostToolUse as Array<Record<string, unknown>>;
  assertEquals(postHooks.length, 1); // old removed, new added
  const inner = postHooks[0].hooks as Array<Record<string, unknown>>;
  assertEquals(inner[0].timeout, 60); // new timeout
});

// --- mergeCursorHooks ---

Deno.test("mergeCursorHooks: preserves version and merges", () => {
  const existing = { version: 1, hooks: {} };
  const newHooks = [
    {
      event: "postToolUse",
      command: "deno run -A .cursor/scripts/flowai-test-hook/run.ts",
      type: "command" as const,
      matcher: "Write|StrReplace",
      timeout: 30,
    },
  ];
  const manifest = { version: 1, hooks: {} };
  const result = mergeCursorHooks(existing, newHooks, manifest);
  assertEquals(result.version, 1);
  const hooks = result.hooks as Record<string, unknown[]>;
  assertEquals(hooks.postToolUse.length, 1);
});

// --- cleanupRemovedHooks ---

Deno.test("cleanupRemovedHooks: removes deinstalled hooks from claude config", () => {
  const config = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Write|Edit",
          hooks: [
            {
              type: "command",
              command: "deno run -A .claude/scripts/old-hook/run.ts",
              timeout: 30,
            },
          ],
        },
        {
          matcher: "Custom",
          hooks: [{ type: "command", command: "user-hook.sh", timeout: 10 }],
        },
      ],
    },
  };
  const manifest = {
    version: 1,
    hooks: {
      "old-hook": {
        event: "PostToolUse",
        matcher: "Write|Edit",
        installedAt: "2026-01-01T00:00:00Z",
      },
    },
  };
  const result = cleanupRemovedHooks(config, manifest, [], "claude");
  const postHooks = (result.hooks as Record<string, unknown[]>).PostToolUse;
  assertEquals(postHooks.length, 1); // only user hook remains
});

// --- Manifest ---

Deno.test("readManifest: null returns empty manifest", () => {
  const m = readManifest(null);
  assertEquals(m.version, 1);
  assertEquals(Object.keys(m.hooks).length, 0);
});

Deno.test("readManifest: valid JSON parsed correctly", () => {
  const json = JSON.stringify({
    version: 1,
    hooks: {
      "flowai-test-hook": {
        event: "PostToolUse",
        matcher: "Write|Edit",
        installedAt: "2026-01-01T00:00:00Z",
      },
    },
  });
  const m = readManifest(json);
  assertEquals(m.hooks["flowai-test-hook"].event, "PostToolUse");
});

Deno.test("readManifest: invalid JSON returns empty", () => {
  const m = readManifest("{bad json");
  assertEquals(m.version, 1);
  assertEquals(Object.keys(m.hooks).length, 0);
});

Deno.test("buildManifest: creates manifest from hook defs", () => {
  const hookDefs = [
    {
      name: "flowai-test-hook",
      hook: {
        event: "PostToolUse",
        matcher: "Write|Edit",
        description: "Auto-lint",
      } as HookDefinition,
    },
    {
      name: "flowai-mermaid-validate",
      hook: {
        event: "PostToolUse",
        matcher: "Write|Edit",
        description: "Validate Mermaid",
      } as HookDefinition,
    },
  ];
  const m = buildManifest(hookDefs);
  assertEquals(m.version, 1);
  assertEquals(Object.keys(m.hooks).length, 2);
  assertEquals(m.hooks["flowai-test-hook"].event, "PostToolUse");
  assertEquals(m.hooks["flowai-test-hook"].matcher, "Write|Edit");
  assertEquals(m.hooks["flowai-mermaid-validate"].event, "PostToolUse");
});
