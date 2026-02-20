#!/usr/bin/env -S deno run -A
/**
 * Convert Cursor IDE primitives to Claude Code equivalents.
 *
 * Usage:
 *   deno run -A convert.ts [project_dir] [--dry-run]
 *
 * Converts:
 *   AGENTS.md                → CLAUDE.md
 *   subdir/AGENTS.md         → subdir/CLAUDE.md
 *   .cursor/rules/*.md       → .claude/rules/*.md   (frontmatter: globs→paths)
 *   .cursor/commands/*.md    → .claude/commands/*.md
 *   .cursor/skills/<n>/      → .claude/skills/<n>/
 *   .cursor/agents/*.md      → .claude/agents/*.md   (model, readonly transforms)
 *   .cursor/hooks.json       → .claude/settings.json (hooks section)
 *   .cursor/hooks/           → .claude/hooks/
 *   mcp.json                 → .mcp.json
 *   .cursorignore            → warns (no direct equivalent)
 */

import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import { parse as parseArgs } from "@std/flags";
import { copy as fsCopy, exists, walk } from "@std/fs";
import { dirname, join, relative } from "@std/path";

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): [Record<string, unknown>, string] {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return [{}, content];
  try {
    const fields = (parseYaml(m[1]) as Record<string, unknown>) ?? {};
    return [fields, content.slice(m[0].length)];
  } catch {
    return [{}, content];
  }
}

function serializeFrontmatter(
  fields: Record<string, unknown>,
  body: string,
): string {
  if (Object.keys(fields).length === 0) return body;
  const fm = stringifyYaml(fields).trimEnd();
  return `---\n${fm}\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// Per-primitive transforms
// ---------------------------------------------------------------------------

function transformRule(content: string): string {
  const [fields, body] = parseFrontmatter(content);
  if (Object.keys(fields).length === 0 && !content.startsWith("---")) {
    return content;
  }
  const newFields: Record<string, unknown> = {};
  let globs = fields["globs"];
  if (globs !== undefined && globs !== null) {
    if (typeof globs === "string") globs = [globs];
    newFields["paths"] = globs;
  }
  // alwaysApply, description → dropped
  return serializeFrontmatter(newFields, body);
}

const AGENT_KEEP = new Set([
  "name",
  "description",
  "model",
  "tools",
  "disallowedTools",
  "permissionMode",
  "maxTurns",
  "skills",
  "mcpServers",
  "hooks",
  "memory",
]);

const AGENT_ORDER = [
  "name",
  "description",
  "model",
  "tools",
  "disallowedTools",
  "permissionMode",
  "maxTurns",
  "skills",
  "mcpServers",
  "hooks",
  "memory",
];

function transformAgent(content: string): string {
  const [fields, body] = parseFrontmatter(content);
  if (Object.keys(fields).length === 0 && !content.startsWith("---")) {
    return content;
  }
  const newFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (key === "model") {
      newFields["model"] = val === "fast" ? "haiku" : val;
    } else if (key === "readonly") {
      if (val === true) {
        newFields["disallowedTools"] = "Write, Edit, NotebookEdit";
      }
      // readonly: false → no restriction, skip
    } else if (AGENT_KEEP.has(key)) {
      newFields[key] = val;
    }
    // Unknown Cursor-specific fields → drop
  }
  // Canonical Claude Code field order
  const ordered: Record<string, unknown> = {};
  for (const k of AGENT_ORDER) {
    if (k in newFields) ordered[k] = newFields[k];
  }
  for (const [k, v] of Object.entries(newFields)) {
    if (!(k in ordered)) ordered[k] = v;
  }
  return serializeFrontmatter(ordered, body);
}

// Cursor event → [Claude Code event, matcher | null]
const EVENT_MAP: Record<string, [string, string | null]> = {
  beforeShellExecution: ["PreToolUse", "Bash"],
  afterShellExecution: ["PostToolUse", "Bash"],
  preToolUse: ["PreToolUse", null],
  postToolUse: ["PostToolUse", null],
  postToolUseFailure: ["PostToolUseFailure", null],
  sessionStart: ["SessionStart", null],
  sessionEnd: ["SessionEnd", null],
  subagentStart: ["SubagentStart", null],
  subagentStop: ["SubagentStop", null],
  stop: ["Stop", null],
  preCompact: ["PreCompact", null],
  afterFileEdit: ["PostToolUse", "Edit|Write"],
  beforeSubmitPrompt: ["UserPromptSubmit", null],
  beforeMCPExecution: ["PreToolUse", "mcp__.*"],
  afterMCPExecution: ["PostToolUse", "mcp__.*"],
  beforeReadFile: ["PreToolUse", "Read"],
};

interface HookHandler {
  type: string;
  command: string;
  timeout?: number;
}

interface HookGroup {
  matcher?: string;
  hooks: HookHandler[];
}

function convertHooks(
  cursorData: Record<string, unknown>,
): [Record<string, HookGroup[]>, string[]] {
  const ccHooks: Record<string, HookGroup[]> = {};
  const warnings: string[] = [];
  const cursorHooks = (cursorData["hooks"] ?? {}) as Record<
    string,
    Array<Record<string, unknown>>
  >;

  for (const [cursorEvent, handlers] of Object.entries(cursorHooks)) {
    let ccEvent: string;
    let matcher: string | null;

    if (!(cursorEvent in EVENT_MAP)) {
      warnings.push(
        `Unknown Cursor hook event '${cursorEvent}' — kept with original name`,
      );
      ccEvent = cursorEvent;
      matcher = null;
    } else {
      [ccEvent, matcher] = EVENT_MAP[cursorEvent];
    }

    const ccHandlers: HookHandler[] = handlers.map((h) => {
      const command = String(h["command"] ?? "").replace(
        ".cursor/hooks/",
        ".claude/hooks/",
      );
      const handler: HookHandler = { type: "command", command };
      if (h["timeout"] !== undefined) handler.timeout = h["timeout"] as number;
      return handler;
    });

    const entry: HookGroup = matcher
      ? { matcher, hooks: ccHandlers }
      : { hooks: ccHandlers };

    if (!(ccEvent in ccHooks)) ccHooks[ccEvent] = [];
    ccHooks[ccEvent].push(entry);
  }

  return [ccHooks, warnings];
}

// ---------------------------------------------------------------------------
// Main conversion logic
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  ".cursor",
  ".claude",
  ".git",
  "node_modules",
  ".opencode",
  ".codex",
  ".agent",
  "__pycache__",
  "dist",
  "build",
]);

/** Recursively find all files named `filename` in `dir`, skipping SKIP_DIRS. */
async function findFiles(dir: string, filename: string): Promise<string[]> {
  const results: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        results.push(...(await findFiles(fullPath, filename)));
      } else if (entry.isFile && entry.name === filename) {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore inaccessible directories
  }
  return results;
}

async function runConversion(
  projectDir: string,
  dryRun: boolean,
): Promise<void> {
  let convertedCount = 0;
  let warnCount = 0;

  function ok(msg: string): void {
    console.log(`  ✓  ${msg}`);
    convertedCount++;
  }

  function warn(msg: string): void {
    console.log(`  ⚠  ${msg}`);
    warnCount++;
  }

  async function writeFile(dst: string, content: string): Promise<void> {
    if (dryRun) {
      console.log(`     [dry] → ${relative(projectDir, dst)}`);
      return;
    }
    await Deno.mkdir(dirname(dst), { recursive: true });
    await Deno.writeTextFile(dst, content);
  }

  async function copyFile(src: string, dst: string): Promise<void> {
    if (dryRun) {
      console.log(`     [dry] copy → ${relative(projectDir, dst)}`);
      return;
    }
    await Deno.mkdir(dirname(dst), { recursive: true });
    await Deno.copyFile(src, dst);
  }

  async function copyTree(src: string, dst: string): Promise<void> {
    if (dryRun) {
      console.log(`     [dry] copy tree → ${relative(projectDir, dst)}/`);
      return;
    }
    await fsCopy(src, dst, { overwrite: true });
  }

  // ------------------------------------------------------------------
  // 1. AGENTS.md → CLAUDE.md  (root + subdirs, skipping SKIP_DIRS)
  // ------------------------------------------------------------------
  const agentsMdFiles = (await findFiles(projectDir, "AGENTS.md")).sort();
  for (const agentsMd of agentsMdFiles) {
    const claudeMd = join(dirname(agentsMd), "CLAUDE.md");
    const rel = relative(projectDir, agentsMd);
    if (await exists(claudeMd)) {
      warn(`${rel}: CLAUDE.md already exists — skipped`);
    } else {
      ok(`${rel} → ${relative(projectDir, claudeMd)}`);
      await copyFile(agentsMd, claudeMd);
    }
  }

  // ------------------------------------------------------------------
  // 2. .cursor/rules/*.md → .claude/rules/*.md
  // ------------------------------------------------------------------
  const cursorRules = join(projectDir, ".cursor", "rules");
  if (await exists(cursorRules)) {
    for await (const entry of walk(cursorRules, { includeDirs: false })) {
      if (!entry.name.endsWith(".md")) continue;
      const rel = relative(cursorRules, entry.path);
      const dst = join(projectDir, ".claude", "rules", rel);
      ok(`.cursor/rules/${rel} → .claude/rules/${rel}`);
      const content = await Deno.readTextFile(entry.path);
      await writeFile(dst, transformRule(content));
    }
  }

  // ------------------------------------------------------------------
  // 3. .cursor/commands/*.md → .claude/commands/*.md
  // ------------------------------------------------------------------
  const cursorCommands = join(projectDir, ".cursor", "commands");
  if (await exists(cursorCommands)) {
    for await (const entry of walk(cursorCommands, { includeDirs: false })) {
      if (!entry.name.endsWith(".md")) continue;
      const rel = relative(cursorCommands, entry.path);
      const dst = join(projectDir, ".claude", "commands", rel);
      ok(`.cursor/commands/${rel} → .claude/commands/${rel}`);
      await copyFile(entry.path, dst);
    }
  }

  // ------------------------------------------------------------------
  // 4. .cursor/skills/<name>/ → .claude/skills/<name>/
  // ------------------------------------------------------------------
  const cursorSkills = join(projectDir, ".cursor", "skills");
  if (await exists(cursorSkills)) {
    const skillDirs: string[] = [];
    for await (const entry of Deno.readDir(cursorSkills)) {
      if (entry.isDirectory) skillDirs.push(entry.name);
    }
    for (const name of skillDirs.sort()) {
      ok(`.cursor/skills/${name}/ → .claude/skills/${name}/`);
      await copyTree(
        join(cursorSkills, name),
        join(projectDir, ".claude", "skills", name),
      );
    }
  }

  // ------------------------------------------------------------------
  // 5. .cursor/agents/*.md → .claude/agents/*.md
  // ------------------------------------------------------------------
  const cursorAgents = join(projectDir, ".cursor", "agents");
  if (await exists(cursorAgents)) {
    const agentFiles: string[] = [];
    for await (const entry of Deno.readDir(cursorAgents)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        agentFiles.push(entry.name);
      }
    }
    for (const name of agentFiles.sort()) {
      const src = join(cursorAgents, name);
      const dst = join(projectDir, ".claude", "agents", name);
      ok(`.cursor/agents/${name} → .claude/agents/${name}`);
      const content = await Deno.readTextFile(src);
      await writeFile(dst, transformAgent(content));
    }
  }

  // ------------------------------------------------------------------
  // 6. .cursor/hooks.json → .claude/settings.json
  //    .cursor/hooks/      → .claude/hooks/
  // ------------------------------------------------------------------
  const cursorHooksFile = join(projectDir, ".cursor", "hooks.json");
  if (await exists(cursorHooksFile)) {
    let cursorData: Record<string, unknown> = {};
    try {
      cursorData = JSON.parse(await Deno.readTextFile(cursorHooksFile));
    } catch (e) {
      warn(`.cursor/hooks.json: JSON parse error — ${e}`);
    }

    const [ccHooks, hookWarnings] = convertHooks(cursorData);
    for (const w of hookWarnings) warn(w);

    // Copy hook scripts directory
    const cursorHooksDir = join(projectDir, ".cursor", "hooks");
    if (await exists(cursorHooksDir)) {
      ok(`.cursor/hooks/ → .claude/hooks/`);
      await copyTree(cursorHooksDir, join(projectDir, ".claude", "hooks"));
    }

    // Merge into settings.json
    const settingsFile = join(projectDir, ".claude", "settings.json");
    let existing: Record<string, unknown> = {};
    if (await exists(settingsFile)) {
      try {
        existing = JSON.parse(await Deno.readTextFile(settingsFile));
      } catch {
        existing = {};
      }
      if ("hooks" in existing) {
        warn("settings.json already has 'hooks' — Cursor hooks appended");
        const existingHooks = existing["hooks"] as Record<string, HookGroup[]>;
        for (const [event, entries] of Object.entries(ccHooks)) {
          if (!(event in existingHooks)) existingHooks[event] = [];
          existingHooks[event].push(...entries);
        }
      } else {
        existing["hooks"] = ccHooks;
      }
    } else {
      existing = { hooks: ccHooks };
    }

    ok(`.cursor/hooks.json → .claude/settings.json`);
    await writeFile(settingsFile, JSON.stringify(existing, null, 2) + "\n");
  }

  // ------------------------------------------------------------------
  // 7. mcp.json → .mcp.json
  // ------------------------------------------------------------------
  const mcpSrc = join(projectDir, "mcp.json");
  const mcpDst = join(projectDir, ".mcp.json");
  if (await exists(mcpSrc)) {
    if (await exists(mcpDst)) {
      warn("mcp.json: .mcp.json already exists — skipped");
    } else {
      ok("mcp.json → .mcp.json");
      await copyFile(mcpSrc, mcpDst);
    }
  }

  // ------------------------------------------------------------------
  // 8. .cursorignore — warn
  // ------------------------------------------------------------------
  if (await exists(join(projectDir, ".cursorignore"))) {
    warn(".cursorignore: no direct Claude Code equivalent");
    warn(
      "  Claude Code respects .gitignore (respectGitignore: true by default)",
    );
    warn(
      "  Action: manually merge .cursorignore patterns into .gitignore if needed",
    );
  }

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log();
  console.log(`Converted: ${convertedCount}  Warnings: ${warnCount}`);
  if (dryRun) console.log("(dry run — no files written)");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const args = parseArgs(Deno.args, { boolean: ["dry-run"] });
  const dryRun = args["dry-run"] as boolean;
  const positional = args._ as string[];

  let projectDir = Deno.cwd();
  if (positional.length > 0) {
    try {
      projectDir = await Deno.realPath(String(positional[0]));
    } catch {
      console.error(`Error: path not found: ${positional[0]}`);
      Deno.exit(1);
    }
  }

  try {
    const stat = await Deno.stat(projectDir);
    if (!stat.isDirectory) {
      console.error(`Error: not a directory: ${projectDir}`);
      Deno.exit(1);
    }
  } catch {
    console.error(`Error: path not found: ${projectDir}`);
    Deno.exit(1);
  }

  console.log(`${dryRun ? "[DRY RUN] " : ""}Converting Cursor → Claude Code`);
  console.log(`Project: ${projectDir}\n`);
  await runConversion(projectDir, dryRun);
}
