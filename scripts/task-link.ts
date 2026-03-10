/**
 * task-link.ts — Symlinks skills and agents into IDE-specific directories.
 *
 * Sources:
 *   - .dev/skills/*          → dev-only skills (IDE-specific guides, etc.)
 *   - .dev/agents/*          → dev-only agents
 *   - framework/skills/*     → product skills (flow-commit, flow-init, etc.)
 *   - framework/agents/<ide> → product agents per IDE (claude, cursor, opencode)
 *
 * Targets (per IDE):
 *   .cursor/skills/<name>  → symlink to source
 *   .claude/skills/<name>  → symlink to source
 *   .opencode/skills/<name> → symlink to source
 *   (same for agents)
 *
 * Each skill/agent gets its own relative symlink.
 *
 * Also links non-skill resources (.dev/hooks, .dev/hooks.json, .dev/worktrees.json).
 *
 * Usage: deno task link
 *
 * Idempotent: safe to run multiple times. Existing correct symlinks are skipped.
 * Removes stale symlinks (targets that no longer exist in sources).
 */

import { join, resolve } from "@std/path";

/** IDE directories to populate */
const IDE_DIRS = [".cursor", ".claude", ".opencode"] as const;
type IdeDir = typeof IDE_DIRS[number];

/** Map IDE dir name to framework/agents/ subdirectory */
const IDE_AGENT_SUBDIR: Record<IdeDir, string> = {
  ".cursor": "cursor",
  ".claude": "claude",
  ".opencode": "opencode",
};

/** Non-skill/agent resources to link as-is from .dev/ */
interface StaticLinkSpec {
  source: string;
  targets: string[];
}

const STATIC_LINKS: StaticLinkSpec[] = [
  { source: ".dev/hooks", targets: [".cursor/hooks"] },
  { source: ".dev/hooks.json", targets: [".cursor/hooks.json"] },
  { source: ".dev/worktrees.json", targets: [".cursor/worktrees.json"] },
];

interface LinkResult {
  target: string;
  status: "created" | "exists" | "removed" | "skipped" | "error";
  message?: string;
}

// ── Filesystem helpers ──────────────────────────────────────────────

async function isSymlink(path: string): Promise<boolean> {
  try {
    const info = await Deno.lstat(path);
    return info.isSymlink;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}

function computeRelativePath(from: string, to: string): string {
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

async function ensureDir(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}

/** List directory entries (names). Returns [] if dir doesn't exist. */
async function listDir(path: string): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(path)) {
      names.push(entry.name);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return [];
    throw e;
  }
  return names;
}

// ── Symlink operations ──────────────────────────────────────────────

async function ensureSymlink(
  absSource: string,
  absTarget: string,
  targetLabel: string,
): Promise<LinkResult> {
  if (await isSymlink(absTarget)) {
    const currentLink = await Deno.readLink(absTarget);
    const currentResolved = resolve(join(absTarget, ".."), currentLink);

    if (currentResolved === absSource) {
      return { target: targetLabel, status: "exists" };
    }
    // Wrong target — remove and recreate
    await Deno.remove(absTarget);
  } else if (await pathExists(absTarget)) {
    return {
      target: targetLabel,
      status: "skipped",
      message: "real file/directory exists (not a symlink). Remove manually.",
    };
  }

  const targetParent = resolve(absTarget, "..");
  const relPath = computeRelativePath(targetParent, absSource);
  await Deno.symlink(relPath, absTarget);
  return { target: targetLabel, status: "created" };
}

/**
 * Remove a directory-level symlink at `path` if it exists,
 * replacing it with a real directory. Returns true if converted.
 */
async function replaceDirSymlinkWithRealDir(path: string): Promise<boolean> {
  if (await isSymlink(path)) {
    await Deno.remove(path);
    await ensureDir(path);
    return true;
  }
  await ensureDir(path);
  return false;
}

/**
 * Remove stale symlinks inside `dir` that point to non-existent targets
 * or targets outside the expected source directories.
 */
async function removeStaleSymlinks(
  dir: string,
  validSources: Set<string>,
): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  const entries = await listDir(dir);

  for (const name of entries) {
    const absPath = resolve(dir, name);
    if (!(await isSymlink(absPath))) continue;

    const linkTarget = await Deno.readLink(absPath);
    const resolvedTarget = resolve(join(absPath, ".."), linkTarget);

    if (!validSources.has(resolvedTarget)) {
      await Deno.remove(absPath);
      const relPath = absPath.replace(Deno.cwd() + "/", "");
      results.push({
        target: relPath,
        status: "removed",
        message: `stale (pointed to ${linkTarget})`,
      });
    }
  }
  return results;
}

// ── Main logic ──────────────────────────────────────────────────────

async function linkSkills(projectRoot: string): Promise<LinkResult[]> {
  const results: LinkResult[] = [];

  // Collect all skill names and their absolute source paths, per IDE
  for (const ideDir of IDE_DIRS) {
    const targetDir = resolve(projectRoot, ideDir, "skills");
    await replaceDirSymlinkWithRealDir(targetDir);

    // Sources: .dev/skills/* + framework/skills/*
    const devSkills = await listDir(resolve(projectRoot, ".dev/skills"));
    const fwSkills = await listDir(resolve(projectRoot, "framework/skills"));

    const validSources = new Set<string>();

    // .dev/skills first (dev overrides framework if name collision)
    for (const name of devSkills) {
      const absSource = resolve(projectRoot, ".dev/skills", name);
      validSources.add(absSource);
      const absTarget = resolve(targetDir, name);
      results.push(
        await ensureSymlink(absSource, absTarget, `${ideDir}/skills/${name}`),
      );
    }

    for (const name of fwSkills) {
      const absSource = resolve(projectRoot, "framework/skills", name);
      validSources.add(absSource);
      const absTarget = resolve(targetDir, name);
      // Skip if .dev already provided this name (project-level overrides framework)
      if (devSkills.includes(name)) {
        console.error(
          `  Warning: .dev/skills/${name} overrides framework/skills/${name}`,
        );
        continue;
      }
      results.push(
        await ensureSymlink(absSource, absTarget, `${ideDir}/skills/${name}`),
      );
    }

    // Remove stale symlinks
    results.push(...await removeStaleSymlinks(targetDir, validSources));
  }

  return results;
}

async function linkAgents(projectRoot: string): Promise<LinkResult[]> {
  const results: LinkResult[] = [];

  for (const ideDir of IDE_DIRS) {
    const targetDir = resolve(projectRoot, ideDir, "agents");
    await replaceDirSymlinkWithRealDir(targetDir);

    const devAgents = await listDir(resolve(projectRoot, ".dev/agents"));
    const fwAgentSubdir = IDE_AGENT_SUBDIR[ideDir];
    const fwAgents = await listDir(
      resolve(projectRoot, "framework/agents", fwAgentSubdir),
    );

    const validSources = new Set<string>();

    // .dev/agents first
    for (const name of devAgents) {
      const absSource = resolve(projectRoot, ".dev/agents", name);
      validSources.add(absSource);
      const absTarget = resolve(targetDir, name);
      results.push(
        await ensureSymlink(absSource, absTarget, `${ideDir}/agents/${name}`),
      );
    }

    // framework/agents/<ide>/*
    for (const name of fwAgents) {
      const absSource = resolve(
        projectRoot,
        "framework/agents",
        fwAgentSubdir,
        name,
      );
      validSources.add(absSource);
      const absTarget = resolve(targetDir, name);
      if (devAgents.includes(name)) {
        console.error(
          `  Warning: .dev/agents/${name} overrides framework/agents/${fwAgentSubdir}/${name}`,
        );
        continue;
      }
      results.push(
        await ensureSymlink(absSource, absTarget, `${ideDir}/agents/${name}`),
      );
    }

    results.push(...await removeStaleSymlinks(targetDir, validSources));
  }

  return results;
}

async function linkStatic(projectRoot: string): Promise<LinkResult[]> {
  const results: LinkResult[] = [];

  for (const spec of STATIC_LINKS) {
    const absSource = resolve(projectRoot, spec.source);
    if (!(await pathExists(absSource))) {
      for (const target of spec.targets) {
        results.push({
          target,
          status: "error",
          message: `source not found: ${spec.source}`,
        });
      }
      continue;
    }

    for (const target of spec.targets) {
      const absTarget = resolve(projectRoot, target);
      await ensureDir(resolve(absTarget, ".."));
      results.push(await ensureSymlink(absSource, absTarget, target));
    }
  }

  return results;
}

async function main(): Promise<void> {
  const projectRoot = Deno.cwd();
  console.log("Linking skills and agents to IDE directories...\n");

  // Ensure IDE root dirs exist
  for (const ideDir of IDE_DIRS) {
    await ensureDir(resolve(projectRoot, ideDir));
    console.log(`  [d] ${ideDir}/`);
  }

  const results: LinkResult[] = [];
  results.push(...await linkSkills(projectRoot));
  results.push(...await linkAgents(projectRoot));
  results.push(...await linkStatic(projectRoot));

  // Print results
  let hasErrors = false;
  for (const r of results) {
    const icon = r.status === "created"
      ? "+"
      : r.status === "exists"
      ? "="
      : r.status === "removed"
      ? "-"
      : r.status === "skipped"
      ? "!"
      : "x";
    const suffix = r.message ? ` (${r.message})` : "";
    console.log(`  [${icon}] ${r.target}${suffix}`);
    if (r.status === "error") hasErrors = true;
  }

  const created = results.filter((r) => r.status === "created").length;
  const existing = results.filter((r) => r.status === "exists").length;
  const removed = results.filter((r) => r.status === "removed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(
    `\nDone: ${created} created, ${existing} unchanged, ${removed} removed, ${skipped} skipped, ${errors} errors.`,
  );

  if (hasErrors) Deno.exit(1);
}

main();
