// FR-HOOK-RESOURCES.INSTALL — IDE-specific hook config generation
/** Write hook configuration files for each IDE (Claude, Cursor, OpenCode, Codex) */
import { type FsAdapter, join } from "./adapters/fs.ts";
import type { HookDefinition } from "./types.ts";
import {
  cleanupRemovedHooks,
  generateOpenCodePlugin,
  mergeClaudeHooks,
  mergeCursorHooks,
  type readManifest,
  transformHookForClaude,
  transformHookForCursor,
} from "./hooks.ts";

/** Write IDE-specific hook configuration files */
export async function writeHookConfig(
  cwd: string,
  ide: { name: string; configDir: string },
  hookDefs: Array<{ name: string; hook: HookDefinition }>,
  oldManifest: ReturnType<typeof readManifest>,
  fs: FsAdapter,
): Promise<void> {
  const activeNames = hookDefs.map((d) => d.name);

  if (ide.name === "claude") {
    const settingsPath = join(cwd, ide.configDir, "settings.json");
    let existing: Record<string, unknown> = {};
    if (await fs.exists(settingsPath)) {
      try {
        existing = JSON.parse(await fs.readFile(settingsPath));
      } catch {
        // Invalid JSON — start fresh for hooks section
      }
    }

    // Cleanup removed hooks
    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "claude",
    );

    // Generate new hook entries
    const claudeHooks = hookDefs.map(({ name, hook }) =>
      transformHookForClaude(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );

    const merged = mergeClaudeHooks(existing, claudeHooks, oldManifest);
    await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2));
  } else if (ide.name === "cursor") {
    const hooksPath = join(cwd, ide.configDir, "hooks.json");
    let existing: Record<string, unknown> = {};
    if (await fs.exists(hooksPath)) {
      try {
        existing = JSON.parse(await fs.readFile(hooksPath));
      } catch {
        // Invalid JSON
      }
    }

    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "cursor",
    );

    const cursorHooks = hookDefs.map(({ name, hook }) =>
      transformHookForCursor(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );

    const merged = mergeCursorHooks(existing, cursorHooks, oldManifest);
    await fs.writeFile(hooksPath, JSON.stringify(merged, null, 2));
  } else if (ide.name === "opencode") {
    const pluginPath = join(
      cwd,
      ide.configDir,
      "plugins",
      "flowai-hooks.ts",
    );
    const openCodeHooks = hookDefs.map(({ name, hook }) => ({
      name,
      hook,
      scriptPath: `${ide.configDir}/scripts/${name}/run.ts`,
    }));
    const content = generateOpenCodePlugin(openCodeHooks);
    await fs.writeFile(pluginPath, content);
  } else if (ide.name === "codex") {
    // FR-DIST.CODEX-HOOKS — Codex uses Claude-Code-compatible nested schema
    // at <repo>/.codex/hooks.json. Handled by syncCodexHooks elsewhere (call
    // site already gates on experimental.codexHooks).
    const hooksPath = join(cwd, ide.configDir, "hooks.json");
    const existingRaw = await fs.exists(hooksPath)
      ? await fs.readFile(hooksPath)
      : null;
    let existing: Record<string, unknown> = {};
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
          `Failed to parse existing ${hooksPath}: ${msg}. Fix the file by hand and re-run sync.`,
        );
      }
    }

    const activeNames = hookDefs.map((h) => h.name);
    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "claude", // Codex uses the same nested shape as Claude Code
    );

    const codexHooks = hookDefs.map(({ name, hook }) =>
      transformHookForClaude(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );
    const merged = mergeClaudeHooks(existing, codexHooks, oldManifest);
    await fs.writeFile(hooksPath, JSON.stringify(merged, null, 2));
  }
}
