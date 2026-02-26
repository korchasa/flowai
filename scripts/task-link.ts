/**
 * task-link.ts — Creates symlinks from .dev/ (SPOT) to IDE-specific directories.
 *
 * Supported IDEs: Cursor (.cursor/), Claude Code (.claude/), OpenCode (.opencode/)
 *
 * Usage: deno task link
 *
 * Idempotent: safe to run multiple times. Existing correct symlinks are skipped.
 * Non-destructive: real files/dirs at target path are NOT removed — warning is printed.
 */

import { join, resolve } from "@std/path";

interface LinkSpec {
  /** Relative path from project root to the source in .dev/ */
  source: string;
  /** Relative paths from project root to the symlink targets in IDE dirs */
  targets: string[];
}

const LINK_SPECS: LinkSpec[] = [
  {
    source: ".dev/skills",
    targets: [".cursor/skills", ".claude/skills", ".opencode/skills"],
  },
  {
    source: ".dev/agents",
    targets: [".cursor/agents", ".claude/agents", ".opencode/agents"],
  },
  {
    source: ".dev/hooks",
    targets: [".cursor/hooks"],
  },
  {
    source: ".dev/hooks.json",
    targets: [".cursor/hooks.json"],
  },
  {
    source: ".dev/worktrees.json",
    targets: [".cursor/worktrees.json"],
  },
];

interface LinkResult {
  target: string;
  status: "created" | "exists" | "skipped" | "error";
  message?: string;
}

async function ensureParentDir(path: string): Promise<void> {
  const parent = join(path, "..");
  await Deno.mkdir(parent, { recursive: true });
}

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

async function processLink(
  projectRoot: string,
  spec: LinkSpec,
  target: string,
): Promise<LinkResult> {
  const absSource = resolve(projectRoot, spec.source);
  const absTarget = resolve(projectRoot, target);

  // Check source exists
  if (!(await pathExists(absSource))) {
    return {
      target,
      status: "error",
      message: `source not found: ${spec.source}`,
    };
  }

  // Check if target already exists
  if (await pathExists(absTarget) || await isSymlink(absTarget)) {
    if (await isSymlink(absTarget)) {
      const currentLink = await Deno.readLink(absTarget);

      // Resolve both to compare
      const currentResolved = resolve(join(absTarget, ".."), currentLink);
      const sourceResolved = resolve(projectRoot, spec.source);

      if (currentResolved === sourceResolved) {
        return { target, status: "exists" };
      }

      // Wrong target — remove and recreate
      await Deno.remove(absTarget);
    } else {
      // Real file/dir at target — do not destroy
      return {
        target,
        status: "skipped",
        message:
          `real file/directory exists at target (not a symlink). Remove manually if intended.`,
      };
    }
  }

  // Create symlink
  await ensureParentDir(absTarget);

  // Compute relative symlink path from target's parent to source
  const targetParent = resolve(absTarget, "..");
  const relPath = computeRelativePath(targetParent, absSource);

  await Deno.symlink(relPath, absTarget);
  return { target, status: "created" };
}

/**
 * Compute a relative path from `from` directory to `to` path.
 * Both must be absolute paths.
 */
function computeRelativePath(from: string, to: string): string {
  const fromParts = from.split("/").filter(Boolean);
  const toParts = to.split("/").filter(Boolean);

  // Find common prefix length
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

/** Extract unique IDE directories from link specs (e.g. ".cursor", ".claude", ".opencode") */
function getIdeDirs(): string[] {
  const dirs = new Set<string>();
  for (const spec of LINK_SPECS) {
    for (const target of spec.targets) {
      const ideDir = target.split("/")[0]; // e.g. ".cursor" from ".cursor/skills"
      dirs.add(ideDir);
    }
  }
  return [...dirs];
}

async function main(): Promise<void> {
  const projectRoot = Deno.cwd();
  const results: LinkResult[] = [];

  console.log("Linking .dev/ resources to IDE directories...\n");

  // Ensure IDE directories exist
  for (const ideDir of getIdeDirs()) {
    const absDir = resolve(projectRoot, ideDir);
    try {
      await Deno.mkdir(absDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
    }
    console.log(`  [d] ${ideDir}/`);
  }

  for (const spec of LINK_SPECS) {
    for (const target of spec.targets) {
      const result = await processLink(projectRoot, spec, target);
      results.push(result);
    }
  }

  // Print results
  let hasErrors = false;
  for (const r of results) {
    const icon = r.status === "created"
      ? "+"
      : r.status === "exists"
      ? "="
      : r.status === "skipped"
      ? "!"
      : "x";
    const suffix = r.message ? ` (${r.message})` : "";
    console.log(`  [${icon}] ${r.target}${suffix}`);
    if (r.status === "error") hasErrors = true;
  }

  const created = results.filter((r) => r.status === "created").length;
  const existing = results.filter((r) => r.status === "exists").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(
    `\nDone: ${created} created, ${existing} unchanged, ${skipped} skipped, ${errors} errors.`,
  );

  if (hasErrors) Deno.exit(1);
}

main();
