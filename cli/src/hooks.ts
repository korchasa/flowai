// FR-HOOK-RESOURCES.FORMAT — hook.yaml parsing and event mapping
// FR-HOOK-RESOURCES.INSTALL — IDE-specific config generation
/**
 * Hook configuration generation for IDE-specific formats.
 * Transforms universal hook.yaml → Claude Code / Cursor / OpenCode configs.
 */

import type { HookDefinition } from "./types.ts";

// --- Event name mapping (canonical → IDE-specific) ---

export const EVENT_MAP: Record<string, Record<string, string>> = {
  claude: {}, // canonical = Claude Code, no transform
  cursor: {
    PostToolUse: "postToolUse",
    PreToolUse: "preToolUse",
    SessionStart: "sessionStart",
  },
  opencode: {
    PostToolUse: "tool.execute.after",
    PreToolUse: "tool.execute.before",
    // TODO: verify OpenCode session start event name
  },
};

// --- Tool name mapping (canonical → IDE-specific) ---

export const TOOL_MAP: Record<string, Record<string, string>> = {
  claude: {}, // canonical = Claude Code
  cursor: { Bash: "Shell", Edit: "StrReplace" },
  opencode: { Bash: "bash", Write: "write", Edit: "edit" },
};

// --- Types ---

export interface ClaudeHookEntry {
  event: string;
  matcher?: string;
  hooks: Array<{
    type: "command";
    command: string;
    timeout: number;
  }>;
}

export interface CursorHookEntry {
  event: string;
  command: string;
  type: "command";
  matcher?: string;
  timeout: number;
}

export interface HookManifest {
  version: number;
  hooks: Record<
    string,
    { event: string; matcher?: string; installedAt: string }
  >;
}

// --- Pure transformation functions ---

/** Resolve timeout with defaults: 600 for PreToolUse, 30 for PostToolUse. */
export function resolveTimeout(hook: HookDefinition): number {
  return hook.timeout ?? (hook.event === "PreToolUse" ? 600 : 30);
}

/** Transform matcher tool names for target IDE. */
export function transformMatcher(
  matcher: string,
  ide: string,
): string {
  const map = TOOL_MAP[ide] ?? {};
  return matcher
    .split("|")
    .map((t) => map[t] ?? t)
    .join("|");
}

/** Transform event name for target IDE. */
export function transformEvent(event: string, ide: string): string {
  const map = EVENT_MAP[ide] ?? {};
  return map[event] ?? event;
}

/** Generate Claude Code hook entry. */
export function transformHookForClaude(
  hook: HookDefinition,
  scriptPath: string,
): ClaudeHookEntry {
  const entry: ClaudeHookEntry = {
    event: hook.event, // Claude Code = canonical, no transform
    hooks: [
      {
        type: "command",
        command: `deno run -A ${scriptPath}`,
        timeout: resolveTimeout(hook),
      },
    ],
  };
  if (hook.matcher) {
    entry.matcher = hook.matcher;
  }
  return entry;
}

/** Generate Cursor hook entry. */
export function transformHookForCursor(
  hook: HookDefinition,
  scriptPath: string,
): CursorHookEntry {
  const entry: CursorHookEntry = {
    event: transformEvent(hook.event, "cursor"),
    command: `deno run -A ${scriptPath}`,
    type: "command",
    timeout: resolveTimeout(hook),
  };
  if (hook.matcher) {
    entry.matcher = transformMatcher(hook.matcher, "cursor");
  }
  return entry;
}

/** Generate OpenCode plugin file content. */
export function generateOpenCodePlugin(
  hooks: Array<{ name: string; hook: HookDefinition; scriptPath: string }>,
): string {
  const handlers: string[] = [];

  for (const { hook, scriptPath } of hooks) {
    const event = transformEvent(hook.event, "opencode");
    const matcher = hook.matcher
      ? transformMatcher(hook.matcher, "opencode")
      : undefined;

    handlers.push(
      `  // ${hook.description}
  "${event}": async (output) => {
    ${
        matcher
          ? `const tools = "${matcher}".split("|"); if (!tools.includes(output.tool)) return output;`
          : ""
      }
    const input = JSON.stringify({ tool_name: output.tool, tool_input: output.args, tool_response: output.result });
    const result = await $\`echo \${input} | deno run -A ${scriptPath}\`.quiet();
    if (result.stdout.trim()) {
      const parsed = JSON.parse(result.stdout);
      if (parsed.additionalContext) return { ...output, context: parsed.additionalContext };
    }
    return output;
  },`,
    );
  }

  return `import type { Plugin } from "@opencode-ai/plugin"
export default (async ({ directory, $ }) => ({
${handlers.join("\n")}
})) satisfies Plugin
`;
}

// --- Merge functions ---

/** Merge Claude Code hook entries into existing settings. */
export function mergeClaudeHooks(
  existing: Record<string, unknown>,
  newHooks: ClaudeHookEntry[],
  manifest: HookManifest,
): Record<string, unknown> {
  const result = { ...existing };
  const existingHooks = (result.hooks ?? {}) as Record<string, unknown[]>;
  const mergedHooks: Record<string, unknown[]> = { ...existingHooks };

  // Remove old flowai hooks (identified by manifest)
  const manifestNames = new Set(Object.keys(manifest.hooks));
  for (const eventKey of Object.keys(mergedHooks)) {
    const entries = mergedHooks[eventKey] as Array<
      Record<string, unknown>
    >;
    mergedHooks[eventKey] = entries.filter((entry) => {
      // Keep if not a flowai hook (doesn't match any manifest entry's command pattern)
      const innerHooks = entry.hooks as
        | Array<
          Record<string, unknown>
        >
        | undefined;
      if (!innerHooks) return true;
      return !innerHooks.some((h) => {
        const cmd = String(h.command ?? "");
        return [...manifestNames].some((name) =>
          cmd.includes(`scripts/${name}/run.ts`)
        );
      });
    });
  }

  // Add new flowai hooks
  for (const hook of newHooks) {
    const eventEntries = mergedHooks[hook.event] as Array<
      Record<string, unknown>
    > ?? [];
    const { event: _event, ...entry } = hook;
    eventEntries.push(entry);
    mergedHooks[hook.event] = eventEntries;
  }

  // Clean up empty event arrays
  for (const key of Object.keys(mergedHooks)) {
    if (
      Array.isArray(mergedHooks[key]) && mergedHooks[key].length === 0
    ) {
      delete mergedHooks[key];
    }
  }

  result.hooks = mergedHooks;
  return result;
}

/** Merge Cursor hook entries into existing hooks.json. */
export function mergeCursorHooks(
  existing: Record<string, unknown>,
  newHooks: CursorHookEntry[],
  manifest: HookManifest,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...existing,
    version: existing.version ?? 1,
  };
  const existingHooksObj = (result.hooks ?? {}) as Record<
    string,
    unknown[]
  >;
  const mergedHooks: Record<string, unknown[]> = { ...existingHooksObj };

  // Remove old flowai hooks
  const manifestNames = new Set(Object.keys(manifest.hooks));
  for (const eventKey of Object.keys(mergedHooks)) {
    const entries = mergedHooks[eventKey] as Array<
      Record<string, unknown>
    >;
    mergedHooks[eventKey] = entries.filter((entry) => {
      const cmd = String(entry.command ?? "");
      return ![...manifestNames].some((name) =>
        cmd.includes(`scripts/${name}/run.ts`)
      );
    });
  }

  // Add new hooks
  for (const hook of newHooks) {
    const eventEntries = mergedHooks[hook.event] as Array<
      Record<string, unknown>
    > ?? [];
    const { event: _event, ...entry } = hook;
    eventEntries.push(entry);
    mergedHooks[hook.event] = eventEntries;
  }

  // Clean up empty arrays
  for (const key of Object.keys(mergedHooks)) {
    if (
      Array.isArray(mergedHooks[key]) && mergedHooks[key].length === 0
    ) {
      delete mergedHooks[key];
    }
  }

  result.hooks = mergedHooks;
  return result;
}

/** Remove hooks that are no longer in active set from config. */
export function cleanupRemovedHooks(
  config: Record<string, unknown>,
  manifest: HookManifest,
  activeNames: string[],
  ide: string,
): Record<string, unknown> {
  const activeSet = new Set(activeNames);
  const removedNames = Object.keys(manifest.hooks).filter(
    (n) => !activeSet.has(n),
  );
  if (removedNames.length === 0) return config;

  const result = { ...config };
  const hooksObj = (result.hooks ?? {}) as Record<string, unknown[]>;
  const cleaned: Record<string, unknown[]> = { ...hooksObj };

  for (const eventKey of Object.keys(cleaned)) {
    const entries = cleaned[eventKey] as Array<Record<string, unknown>>;
    cleaned[eventKey] = entries.filter((entry) => {
      if (ide === "claude") {
        const innerHooks = entry.hooks as
          | Array<
            Record<string, unknown>
          >
          | undefined;
        if (!innerHooks) return true;
        return !innerHooks.some((h) => {
          const cmd = String(h.command ?? "");
          return removedNames.some((name) =>
            cmd.includes(`scripts/${name}/run.ts`)
          );
        });
      }
      // Cursor
      const cmd = String(entry.command ?? "");
      return !removedNames.some((name) =>
        cmd.includes(`scripts/${name}/run.ts`)
      );
    });
    if (cleaned[eventKey].length === 0) delete cleaned[eventKey];
  }

  result.hooks = cleaned;
  return result;
}

// --- Manifest ---

/** Read hook manifest. Returns empty manifest if file doesn't exist. */
export function readManifest(
  content: string | null,
): HookManifest {
  if (!content) return { version: 1, hooks: {} };
  try {
    return JSON.parse(content) as HookManifest;
  } catch {
    return { version: 1, hooks: {} };
  }
}

/** Build a manifest from hook definitions. */
export function buildManifest(
  hookDefs: Array<{ name: string; hook: HookDefinition }>,
): HookManifest {
  const hooks: HookManifest["hooks"] = {};
  const now = new Date().toISOString();
  for (const { name, hook } of hookDefs) {
    hooks[name] = {
      event: hook.event,
      ...(hook.matcher ? { matcher: hook.matcher } : {}),
      installedAt: now,
    };
  }
  return { version: 1, hooks };
}
