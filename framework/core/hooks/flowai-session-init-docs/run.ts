#!/usr/bin/env -S deno run --allow-read --allow-env

/**
 * flowai-session-init-docs hook: inject project documentation into session context.
 * SessionStart hook — reads project docs and outputs them via additionalContext.
 *
 * AGENTS.md is NOT injected — already auto-loaded via CLAUDE.md symlink mechanism.
 * Doc list is configurable via .flowai.yaml `sessionDocs` field.
 * Default: [] (no injection without explicit config).
 * flowai-init populates sessionDocs when generating SRS/SDS.
 */

import { parse as parseYaml } from "jsr:@std/yaml@1/parse";

/** Default: empty. Users configure via .flowai.yaml `sessionDocs`. */
export const DEFAULT_DOCS: string[] = [];

/** Read a file, return content or null if not found. */
export async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

/** Load sessionDocs from .flowai.yaml, fallback to DEFAULT_DOCS. */
export async function loadDocList(projectDir: string): Promise<string[]> {
  const raw = await safeReadFile(`${projectDir}/.flowai.yaml`);
  if (!raw) return DEFAULT_DOCS;
  try {
    const config = parseYaml(raw) as Record<string, unknown>;
    const docs = config?.sessionDocs;
    if (Array.isArray(docs) && docs.every((d) => typeof d === "string")) {
      return docs as string[];
    }
  } catch { /* parse error — use defaults */ }
  return DEFAULT_DOCS;
}

/** Build additionalContext from doc files. Returns null if no docs found. */
export async function buildContext(
  projectDir: string,
  docs: string[],
): Promise<string | null> {
  const parts: string[] = [];
  for (const doc of docs) {
    const content = await safeReadFile(`${projectDir}/${doc}`);
    if (content !== null) {
      parts.push(`--- ${doc} ---\n${content}`);
    }
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// --- Entry point ---
if (import.meta.main) {
  const projectDir = Deno.env.get("CLAUDE_PROJECT_DIR") ??
    Deno.env.get("CURSOR_PROJECT_DIR") ?? Deno.cwd();

  const docs = await loadDocList(projectDir);
  const context = await buildContext(projectDir, docs);
  if (!context) Deno.exit(0);

  const isClaude = !!Deno.env.get("CLAUDE_PROJECT_DIR");
  if (isClaude) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }));
  } else {
    // Cursor/other: plain stdout shown to model
    console.log(context);
  }
}
