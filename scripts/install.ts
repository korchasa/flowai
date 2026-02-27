/**
 * install.ts — Interactive global installer for AssistFlow framework.
 *
 * Installs skills and agents from framework/ into global IDE config directories
 * (~/.cursor/, ~/.claude/, ~/.config/opencode/) via per-item symlinks.
 *
 * Usage:
 *   Local:  deno task install
 *   Remote: deno run -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts
 *   Update: deno run -A <url> --update
 *
 * Fully interactive: no changes without user confirmation.
 * Idempotent: safe to run multiple times.
 * Non-destructive: user files are never overwritten.
 */

import { dirname, fromFileUrl, join, resolve } from "jsr:@std/path@^0.224.0";

const REPO_URL = "https://github.com/korchasa/flow.git";
const INSTALL_DIR_NAME = ".assistflow";

// ─── Types ───

export interface IDEConfig {
  name: string;
  configDir: string;
  supportsAgents: boolean;
  /** Subdirectory name inside framework/agents/ for this IDE (e.g. "claude", "cursor", "opencode"). */
  agentSubdir: string;
}

export interface FrameworkAssets {
  frameworkDir: string;
  skills: string[]; // directory names: ["flow-commit", "flow-plan", ...]
  agents: string[]; // file names: ["flow-commit.md", ...]
}

export interface PlanItem {
  type: "skill" | "agent" | "dir";
  name: string;
  sourcePath: string;
  targetPath: string;
  action: "create" | "update" | "ok" | "conflict" | "stale" | "replace_broken";
  detail?: string;
}

/** Minimal file info needed by the planner. */
export interface FileInfoLike {
  isSymlink: boolean;
  isFile: boolean;
  isDirectory: boolean;
}

/** Abstraction over fs operations for testability. */
export interface FsAdapter {
  lstat(path: string): FileInfoLike | Promise<FileInfoLike>;
  readLink(path: string): string | Promise<string>;
  readDir(path: string): AsyncIterable<Deno.DirEntry>;
}

// ─── Pure functions (exported for tests) ───

/**
 * Discover framework assets from the given directory.
 * Scans framework/skills/ for subdirectories and framework/agents/{agentSubdir}/ for .md files.
 * @param agentSubdir — IDE-specific subdirectory inside framework/agents/ (e.g. "claude", "cursor", "opencode").
 */
export async function discoverFramework(
  frameworkDir: string,
  agentSubdir?: string,
): Promise<FrameworkAssets> {
  const skills: string[] = [];
  const agents: string[] = [];

  const skillsDir = join(frameworkDir, "skills");
  try {
    for await (const entry of Deno.readDir(skillsDir)) {
      if (entry.isDirectory) {
        skills.push(entry.name);
      }
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }

  if (agentSubdir) {
    const agentsDir = join(frameworkDir, "agents", agentSubdir);
    try {
      for await (const entry of Deno.readDir(agentsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          agents.push(entry.name);
        }
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }

  skills.sort();
  agents.sort();

  return { frameworkDir, skills, agents };
}

/**
 * Detect installed IDEs by checking config directory existence.
 */
export async function detectIDEs(homeDir: string): Promise<IDEConfig[]> {
  const candidates: IDEConfig[] = [
    {
      name: "Cursor",
      configDir: join(homeDir, ".cursor"),
      supportsAgents: true,
      agentSubdir: "cursor",
    },
    {
      name: "Claude Code",
      configDir: join(homeDir, ".claude"),
      supportsAgents: true,
      agentSubdir: "claude",
    },
    {
      name: "OpenCode",
      configDir: join(homeDir, ".config", "opencode"),
      supportsAgents: true,
      agentSubdir: "opencode",
    },
  ];

  const found: IDEConfig[] = [];
  for (const ide of candidates) {
    try {
      const info = await Deno.lstat(ide.configDir);
      if (info.isDirectory || info.isSymlink) {
        found.push(ide);
      }
    } catch {
      // not found — skip
    }
  }
  return found;
}

/**
 * Compute installation plan for a single IDE.
 * Pure function — all fs access goes through the FsAdapter.
 */
export async function computePlan(
  ide: IDEConfig,
  assets: FrameworkAssets,
  fs: FsAdapter,
): Promise<PlanItem[]> {
  const items: PlanItem[] = [];

  // Check parent directories for broken symlinks
  const dirsToCheck = ["skills"];
  if (ide.supportsAgents) dirsToCheck.push("agents");

  for (const subdir of dirsToCheck) {
    const dirPath = resolve(ide.configDir, subdir);
    try {
      const info = await fs.lstat(dirPath);
      if (info.isSymlink) {
        const linkTarget = await fs.readLink(dirPath);
        items.push({
          type: "dir",
          name: `${subdir}/`,
          sourcePath: "",
          targetPath: dirPath,
          action: "replace_broken",
          detail: `symlink -> ${linkTarget}`,
        });
      }
    } catch {
      // Not found — will be created by mkdir, no action needed
    }
  }

  // Plan skills
  for (const skill of assets.skills) {
    const sourcePath = resolve(assets.frameworkDir, "skills", skill);
    const targetPath = resolve(ide.configDir, "skills", skill);
    const action = await classifyTarget(targetPath, sourcePath, fs);
    items.push({
      type: "skill",
      name: skill,
      sourcePath,
      targetPath,
      ...action,
    });
  }

  // Plan agents (if IDE supports them)
  if (ide.supportsAgents) {
    for (const agent of assets.agents) {
      const sourcePath = resolve(
        assets.frameworkDir,
        "agents",
        ide.agentSubdir,
        agent,
      );
      const targetPath = resolve(ide.configDir, "agents", agent);
      const action = await classifyTarget(targetPath, sourcePath, fs);
      items.push({
        type: "agent",
        name: agent,
        sourcePath,
        targetPath,
        ...action,
      });
    }
  }

  // Detect stale symlinks (framework-managed symlinks whose source no longer exists)
  const staleDirs: { subdir: string; type: "skill" | "agent" }[] = [
    { subdir: "skills", type: "skill" },
  ];
  if (ide.supportsAgents) {
    staleDirs.push({ subdir: "agents", type: "agent" });
  }

  const knownNames = new Set([
    ...assets.skills.map((s) => `skills/${s}`),
    ...assets.agents.map((a) => `agents/${a}`),
  ]);

  for (const { subdir, type } of staleDirs) {
    const dirPath = resolve(ide.configDir, subdir);
    try {
      for await (const entry of fs.readDir(dirPath)) {
        const key = `${subdir}/${entry.name}`;
        if (knownNames.has(key)) continue; // already planned above

        const entryPath = resolve(dirPath, entry.name);
        try {
          const info = await fs.lstat(entryPath);
          if (info.isSymlink) {
            const linkTarget = await fs.readLink(entryPath);
            const resolved = resolveLink(entryPath, linkTarget);
            // Only consider stale if it points into our framework dir
            if (resolved.startsWith(assets.frameworkDir + "/")) {
              items.push({
                type,
                name: entry.name,
                sourcePath: resolved,
                targetPath: entryPath,
                action: "stale",
                detail: "symlink target removed from framework",
              });
            }
          }
        } catch {
          // can't stat — skip
        }
      }
    } catch {
      // dir doesn't exist — no stale items
    }
  }

  return items;
}

/** Classify a single target path against its expected source. */
async function classifyTarget(
  targetPath: string,
  sourcePath: string,
  fs: FsAdapter,
): Promise<{ action: PlanItem["action"]; detail?: string }> {
  try {
    const info = await fs.lstat(targetPath);
    if (info.isSymlink) {
      const linkTarget = await fs.readLink(targetPath);
      const resolved = resolveLink(targetPath, linkTarget);
      if (resolved === sourcePath) {
        return { action: "ok" };
      }
      return { action: "update", detail: `current -> ${linkTarget}` };
    }
    // Real file or directory
    return {
      action: "conflict",
      detail: "real file/directory exists, skip",
    };
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return { action: "create" };
    }
    throw e;
  }
}

/** Resolve a symlink target to an absolute path. */
function resolveLink(symlinkPath: string, linkTarget: string): string {
  if (linkTarget.startsWith("/")) return linkTarget;
  return resolve(dirname(symlinkPath), linkTarget);
}

/**
 * Compute a relative path from `from` directory to `to` path.
 * Both must be absolute paths.
 */
export function computeRelativePath(from: string, to: string): string {
  const fromParts = from.split("/").filter(Boolean);
  const toParts = to.split("/").filter(Boolean);

  let common = 0;
  while (
    common < fromParts.length && common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  return [...Array(ups).fill(".."), ...downs].join("/");
}

// ─── Remote install support (exported for tests) ───

export interface ParsedArgs {
  update: boolean;
}

/**
 * Determine if the script is running from a remote URL (https:/http:).
 * When executed via `deno run -A https://...`, import.meta.url starts with https://.
 */
export function isRemoteExecution(importMetaUrl: string): boolean {
  return importMetaUrl.startsWith("https://") ||
    importMetaUrl.startsWith("http://");
}

/**
 * Parse CLI arguments.
 * Supported flags: --update / -u
 */
export function parseArgs(args: string[]): ParsedArgs {
  let update = false;
  for (const arg of args) {
    if (arg === "--update" || arg === "-u") {
      update = true;
    }
  }
  return { update };
}

/**
 * Resolve the framework directory based on execution context.
 *
 * - Local mode (file:// URL): resolve relative to script location → ../framework/
 * - Remote mode (https:// URL): clone/update repo into ~/.assistflow/, return ~/.assistflow/framework/
 */
export async function resolveFrameworkDir(
  importMetaUrl: string,
  args: ParsedArgs,
): Promise<string> {
  if (!isRemoteExecution(importMetaUrl)) {
    // Local mode: resolve relative to script file
    const scriptDir = dirname(fromFileUrl(importMetaUrl));
    return resolve(scriptDir, "..", "framework");
  }

  // Remote mode: use ~/.assistflow/
  const homeDir = Deno.env.get("HOME");
  if (!homeDir) {
    throw new Error("HOME environment variable is not set");
  }

  const installDir = join(homeDir, INSTALL_DIR_NAME);

  try {
    const info = await Deno.lstat(installDir);
    if (info.isDirectory) {
      if (args.update) {
        // Update existing clone
        console.log(`Updating ${installDir}...`);
        const cmd = new Deno.Command("git", {
          args: ["-C", installDir, "pull", "--rebase", "--autostash"],
          stdout: "inherit",
          stderr: "inherit",
        });
        const status = await cmd.output();
        if (!status.success) {
          throw new Error(
            `git pull failed in ${installDir} (exit code ${status.code})`,
          );
        }
      } else {
        console.log(`Using existing ${installDir}/`);
      }
    } else {
      throw new Error(
        `${installDir} exists but is not a directory`,
      );
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      if (args.update) {
        throw new Error(
          `Cannot --update: ${installDir} does not exist. Run without --update first to install.`,
        );
      }
      // Fresh clone
      console.log(`Cloning AssistFlow into ${installDir}...`);
      const cmd = new Deno.Command("git", {
        args: ["clone", "--depth=1", REPO_URL, installDir],
        stdout: "inherit",
        stderr: "inherit",
      });
      const status = await cmd.output();
      if (!status.success) {
        throw new Error(
          `git clone failed (exit code ${status.code}). Ensure git is installed.`,
        );
      }
    } else {
      throw e;
    }
  }

  return join(installDir, "framework");
}

/**
 * Format the plan for display.
 */
export function formatPlan(
  idePlans: { ide: IDEConfig; items: PlanItem[] }[],
): string {
  const lines: string[] = [];

  for (const { ide, items } of idePlans) {
    lines.push(`Plan for ${shortenHome(ide.configDir)}/:`);

    const dirItems = items.filter((i) => i.type === "dir");
    const skills = items.filter((i) => i.type === "skill");
    const agents = items.filter((i) => i.type === "agent");

    if (dirItems.length > 0) {
      for (const item of dirItems) {
        lines.push(formatPlanItem(item));
      }
    }

    if (skills.length > 0) {
      lines.push("  skills/");
      for (const item of skills.sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(formatPlanItem(item));
      }
    }

    if (agents.length > 0) {
      lines.push("  agents/");
      for (const item of agents.sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(formatPlanItem(item));
      }
    }

    const counts = summarizePlan(items);
    lines.push("");
    lines.push(`  Summary: ${counts}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatPlanItem(item: PlanItem): string {
  const icons: Record<PlanItem["action"], string> = {
    create: "+",
    update: "~",
    ok: "=",
    conflict: "!",
    stale: "-",
    replace_broken: "!",
  };
  const labels: Record<PlanItem["action"], string> = {
    create: "create symlink",
    update: "update symlink",
    ok: "up to date",
    conflict: "conflict: user file, skip",
    stale: "stale, remove symlink",
    replace_broken: "replace broken symlink with directory",
  };

  const icon = icons[item.action];
  const label = item.detail
    ? `${labels[item.action]} (${item.detail})`
    : labels[item.action];
  const suffix = item.type === "skill" ? "/" : "";
  const name = `${item.name}${suffix}`;

  return `    [${icon}] ${name.padEnd(40)} ${label}`;
}

function summarizePlan(items: PlanItem[]): string {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.action] = (counts[item.action] ?? 0) + 1;
  }
  const parts: string[] = [];
  if (counts.replace_broken) {
    parts.push(`${counts.replace_broken} broken symlink replaced`);
  }
  if (counts.create) parts.push(`${counts.create} create`);
  if (counts.update) parts.push(`${counts.update} update`);
  if (counts.ok) parts.push(`${counts.ok} up to date`);
  if (counts.stale) parts.push(`${counts.stale} stale`);
  if (counts.conflict) parts.push(`${counts.conflict} conflict`);
  return parts.join(", ") || "no changes";
}

function shortenHome(path: string): string {
  const home = Deno.env.get("HOME") ?? "";
  if (home && path.startsWith(home)) {
    return "~" + path.slice(home.length);
  }
  return path;
}

// ─── Side-effect functions (main flow) ───

/** Real filesystem adapter for production use. */
function realFs(): FsAdapter {
  return {
    lstat: (path: string) => Deno.lstat(path),
    readLink: (path: string) => Deno.readLink(path),
    readDir: (path: string) => Deno.readDir(path),
  };
}

/** Line-by-line reader from stdin. */
class StdinReader {
  private reader: ReadableStreamDefaultReader<string>;

  constructor() {
    let buffer = "";
    const stream = Deno.stdin.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream<string, string>({
          transform(chunk, controller) {
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop()!;
            for (const line of lines) {
              controller.enqueue(line);
            }
          },
          flush(controller) {
            if (buffer) {
              controller.enqueue(buffer);
            }
          },
        }),
      );
    this.reader = stream.getReader();
  }

  async readLine(promptText: string): Promise<string | null> {
    await Deno.stdout.write(new TextEncoder().encode(promptText));
    const result = await this.reader.read();
    if (result.done) return null;
    return result.value.trim();
  }
}

/** Ensure parent directory exists. Broken parent symlinks are handled by replace_broken plan items. */
async function ensureParentDir(dirPath: string): Promise<void> {
  await Deno.mkdir(dirPath, { recursive: true });
}

/** Execute the plan: create/update/remove symlinks. */
async function executePlan(items: PlanItem[]): Promise<void> {
  for (const item of items) {
    switch (item.action) {
      case "create":
      case "update": {
        // Ensure parent directory exists (handles broken symlinks)
        const parent = dirname(item.targetPath);
        await ensureParentDir(parent);

        // Remove old symlink if updating
        if (item.action === "update") {
          await Deno.remove(item.targetPath);
        }

        // Create relative symlink
        const relPath = computeRelativePath(parent, item.sourcePath);
        await Deno.symlink(relPath, item.targetPath);
        break;
      }
      case "replace_broken": {
        // Remove broken symlink and create real directory
        await Deno.remove(item.targetPath);
        await Deno.mkdir(item.targetPath, { recursive: true });
        break;
      }
      case "stale": {
        await Deno.remove(item.targetPath);
        break;
      }
      case "ok":
      case "conflict":
        // no-op
        break;
    }
  }
}

async function main(): Promise<void> {
  const stdin = new StdinReader();
  const args = parseArgs(Deno.args);

  // Phase 0: Resolve framework directory (local or remote clone)
  const frameworkDir = await resolveFrameworkDir(import.meta.url, args);

  // Phase 1: Discovery (skills are shared; agents discovered per-IDE later)

  // Quick skill count for display
  const previewAssets = await discoverFramework(frameworkDir);

  console.log("AssistFlow Installer\n");
  console.log(`Framework: ${frameworkDir}`);
  console.log(`  ${previewAssets.skills.length} skills\n`);

  // Phase 2: IDE detection + selection
  const homeDir = Deno.env.get("HOME") ?? "";
  const foundIDEs = await detectIDEs(homeDir);

  if (foundIDEs.length === 0) {
    console.log(
      "No supported IDEs detected (~/.cursor/, ~/.claude/, ~/.config/opencode/).",
    );
    console.log("Nothing to install.");
    Deno.exit(0);
  }

  console.log("Detected IDEs:");
  for (let i = 0; i < foundIDEs.length; i++) {
    console.log(
      `  [${i + 1}] ${foundIDEs[i].name} (${
        shortenHome(foundIDEs[i].configDir)
      }/)`,
    );
  }
  console.log("");

  const ideInput = await stdin.readLine(
    `Install to (comma-separated numbers, Enter=all): `,
  );

  let selectedIDEs: IDEConfig[];
  if (ideInput === null || ideInput === "") {
    selectedIDEs = foundIDEs;
  } else {
    const indices = ideInput.split(",").map((s: string) =>
      parseInt(s.trim(), 10) - 1
    );
    const invalid = indices.filter((i: number) =>
      i < 0 || i >= foundIDEs.length || isNaN(i)
    );
    if (invalid.length > 0) {
      console.error(`Invalid selection. Exiting.`);
      Deno.exit(1);
    }
    selectedIDEs = indices.map((i: number) => foundIDEs[i]);
  }
  console.log("");

  // Phase 3: Plan computation (per-IDE discovery for agents)
  const fs = realFs();
  const idePlans: { ide: IDEConfig; items: PlanItem[] }[] = [];

  for (const ide of selectedIDEs) {
    const assets = await discoverFramework(frameworkDir, ide.agentSubdir);
    const items = await computePlan(ide, assets, fs);
    idePlans.push({ ide, items });
  }

  // Phase 4: Show plan + confirm
  const allItems = idePlans.flatMap((p) => p.items);
  const actionItems = allItems.filter((i) => i.action !== "ok");

  if (actionItems.length === 0) {
    console.log("Already up to date. Nothing to do.");
    Deno.exit(0);
  }

  console.log(formatPlan(idePlans));

  const confirm = await stdin.readLine("Apply changes? [y/N]: ");
  if (confirm !== "y" && confirm !== "Y") {
    console.log("Cancelled.");
    Deno.exit(0);
  }
  console.log("");

  // Phase 5: Execute
  let created = 0,
    updated = 0,
    removed = 0,
    skipped = 0,
    replaced = 0;

  for (const { items } of idePlans) {
    await executePlan(items);
    for (const item of items) {
      switch (item.action) {
        case "create":
          created++;
          break;
        case "update":
          updated++;
          break;
        case "stale":
          removed++;
          break;
        case "conflict":
          skipped++;
          break;
        case "replace_broken":
          replaced++;
          break;
      }
    }
  }

  const parts: string[] = [];
  if (created) parts.push(`${created} created`);
  if (updated) parts.push(`${updated} updated`);
  if (removed) parts.push(`${removed} removed`);
  if (replaced) parts.push(`${replaced} replaced`);
  if (skipped) parts.push(`${skipped} skipped`);
  console.log(`Done: ${parts.join(", ")}.`);
}

// Run main only when executed directly (not imported for tests)
if (import.meta.main) {
  main();
}
