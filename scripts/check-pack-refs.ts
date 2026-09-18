/**
 * Pack reference + bundle-leakage validator.
 *
 * Two modes (CLI-selected, both invoked from `deno task check`):
 *
 * 1. Default — cross-pack references in source.
 *    Any pack may reference core primitives: OK
 *    Intra-pack references (same pack): OK
 *    Core referencing non-core: ERROR
 *    Non-core-A referencing non-core-B: ERROR
 *    Scans SKILL.md and agent .md files for backtick-quoted primitive names.
 *
 * 2. `--leakage [--dist <path>]` — generator-input leakage gate
 *    (FR-SKILL-COMPOSE). Walks the rendered marketplace tree
 *    (`dist/claude-plugins` by default) and fails with exit 1 + a path list if
 *    any generator input (`atoms/`, `composites/`, legacy `_atom.md` /
 *    `_composite.md`, or `composites.yaml`) reached it. The tree is what the
 *    release job pushes to `korchasa/flowai-plugins`, so this gate reads the
 *    real shipping artefact rather than a probe built for the occasion.
 *    `scripts/build-plugins.ts` writes that tree, and `scripts/task-check.ts`
 *    runs the build before this gate, so the directory is on disk by then.
 *    See documents/tasks/2026/05/generate-skills-from-atoms.md (Commit 1).
 */
import { join } from "@std/path";

export const LEAKED_FILENAMES = [
  "_atom.md",
  "_composite.md",
  "composites.yaml",
] as const;
export const LEAKED_DIRNAMES = ["atoms", "composites"] as const;

/** Rendered marketplace tree written by `scripts/build-plugins.ts`. */
export const DEFAULT_DIST_DIR = "dist/claude-plugins";

export interface PackRefError {
  file: string;
  pack: string;
  referencedName: string;
  referencedPack: string;
  line: number;
}

/**
 * Builds a map of primitive name -> pack name.
 * Primitives: skill directory names + agent file stems.
 */
export async function buildPrimitiveMap(
  frameworkDir: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for await (const pack of Deno.readDir(frameworkDir)) {
    if (!pack.isDirectory) continue;
    const packDir = join(frameworkDir, pack.name);

    // Check it's a real pack (has pack.yaml)
    try {
      await Deno.stat(join(packDir, "pack.yaml"));
    } catch {
      continue;
    }

    // Skills: directory names under skills/
    const skillsDir = join(packDir, "skills");
    try {
      for await (const skill of Deno.readDir(skillsDir)) {
        if (skill.isDirectory) {
          map.set(skill.name, pack.name);
        }
      }
    } catch { /* no skills/ */ }

    // Commands: directory names under commands/ (user-only primitives)
    const commandsDir = join(packDir, "commands");
    try {
      for await (const cmd of Deno.readDir(commandsDir)) {
        if (cmd.isDirectory) {
          map.set(cmd.name, pack.name);
        }
      }
    } catch { /* no commands/ */ }

    // Agents: file stems under agents/
    const agentsDir = join(packDir, "agents");
    try {
      for await (const agent of Deno.readDir(agentsDir)) {
        if (agent.isFile && agent.name.endsWith(".md")) {
          const stem = agent.name.replace(/\.md$/, "");
          map.set(stem, pack.name);
        }
      }
    } catch { /* no agents/ */ }
  }

  return map;
}

/**
 * Scans a file for references to primitives from forbidden packs.
 */
export function findCrossPackRefs(
  fileContent: string,
  filePack: string,
  filePath: string,
  primitiveMap: Map<string, string>,
): PackRefError[] {
  const errors: PackRefError[] = [];
  const lines = fileContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const [name, refPack] of primitiveMap) {
      // Skip same-pack and core references (non-core may reference core)
      if (refPack === filePack) continue;
      if (refPack === "core" && filePack !== "core") continue;

      // Match explicit primitive mentions only. Short unprefixed names such as
      // "review", "plan", or "scaffold" are common prose words, so bare text
      // is not a reliable cross-pack reference signal.
      if (!name.includes("-")) continue;
      const pattern = new RegExp("`" + escapeRegex(name) + "`");
      if (pattern.test(line)) {
        errors.push({
          file: filePath,
          pack: filePack,
          referencedName: name,
          referencedPack: refPack,
          line: i + 1,
        });
      }
    }
  }

  return errors;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates all packs for cross-pack references.
 */
export async function validatePackRefs(
  frameworkDir: string,
): Promise<PackRefError[]> {
  const primitiveMap = await buildPrimitiveMap(frameworkDir);
  const allErrors: PackRefError[] = [];

  for await (const pack of Deno.readDir(frameworkDir)) {
    if (!pack.isDirectory) continue;
    const packDir = join(frameworkDir, pack.name);

    try {
      await Deno.stat(join(packDir, "pack.yaml"));
    } catch {
      continue;
    }

    // Scan SKILL.md files in skills/ and commands/ (both install from
    // SKILL.md; the subdir only differs for author-facing classification).
    for (const subdir of ["skills", "commands"]) {
      const dir = join(packDir, subdir);
      try {
        for await (const entry of Deno.readDir(dir)) {
          if (!entry.isDirectory) continue;
          const skillMdPath = join(dir, entry.name, "SKILL.md");
          try {
            const content = await Deno.readTextFile(skillMdPath);
            const relPath =
              `framework/${pack.name}/${subdir}/${entry.name}/SKILL.md`;
            allErrors.push(
              ...findCrossPackRefs(content, pack.name, relPath, primitiveMap),
            );
          } catch { /* no SKILL.md */ }
        }
      } catch { /* no skills/ or commands/ */ }
    }

    // Scan agent .md files
    const agentsDir = join(packDir, "agents");
    try {
      for await (const agent of Deno.readDir(agentsDir)) {
        if (!agent.isFile || !agent.name.endsWith(".md")) continue;
        const agentPath = join(agentsDir, agent.name);
        const content = await Deno.readTextFile(agentPath);
        const relPath = `framework/${pack.name}/agents/${agent.name}`;
        allErrors.push(
          ...findCrossPackRefs(content, pack.name, relPath, primitiveMap),
        );
      }
    } catch { /* no agents/ */ }
  }

  return allErrors;
}

/**
 * Walks a directory recursively and returns relative paths of files whose
 * basename matches one of the leak-target filenames, plus the relative paths of
 * whole directories named after a leak-target directory. Used by the leakage
 * gate to walk the rendered marketplace tree.
 */
export async function findLeakedFiles(
  rootDir: string,
  targets: readonly string[] = LEAKED_FILENAMES,
  targetDirs: readonly string[] = LEAKED_DIRNAMES,
): Promise<string[]> {
  const targetSet = new Set(targets);
  const targetDirSet = new Set(targetDirs);
  const leaks: string[] = [];
  async function walk(dir: string, rel: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const next = join(dir, entry.name);
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        if (targetDirSet.has(entry.name)) {
          leaks.push(`${nextRel}/`);
          continue;
        }
        await walk(next, nextRel);
      } else if (entry.isFile && targetSet.has(entry.name)) {
        leaks.push(nextRel);
      }
    }
  }
  await walk(rootDir, "");
  leaks.sort();
  return leaks;
}

/**
 * Collects generator inputs that reached the rendered marketplace tree.
 *
 * Throws when `distDir` is absent: the tree is built by
 * `scripts/build-plugins.ts`, which `scripts/task-check.ts` runs first, so a
 * missing directory means the caller skipped the build rather than that the
 * tree is clean. Reporting that as a pass would retire the gate silently.
 */
export async function findDistLeaks(
  distDir: string = DEFAULT_DIST_DIR,
): Promise<string[]> {
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(distDir);
  } catch {
    throw new Error(
      `[check-pack-refs] ${distDir} does not exist — run \`deno task build-plugins\` first`,
    );
  }
  if (!stat.isDirectory) {
    throw new Error(`[check-pack-refs] ${distDir} is not a directory`);
  }
  return await findLeakedFiles(distDir);
}

/**
 * Reads the `--dist <path>` override out of the CLI arguments.
 *
 * A bare `--dist` with no path is an error rather than a silent fall-back to
 * `DEFAULT_DIST_DIR`: the caller asked for one tree, and walking a different
 * one and reporting success would be a false pass on the tree they meant.
 */
export function parseDistArg(args: string[]): string {
  const idx = args.indexOf("--dist");
  if (idx < 0) return DEFAULT_DIST_DIR;
  const value = args[idx + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(
      "[check-pack-refs] --dist needs a path, e.g. `--dist dist/claude-plugins`",
    );
  }
  return value;
}

async function runLeakageMode(args: string[]): Promise<number> {
  let distDir: string;
  let leaks: string[];
  try {
    distDir = parseDistArg(args);
    leaks = await findDistLeaks(distDir);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
  if (leaks.length === 0) {
    console.log(
      `[check-pack-refs] leakage check passed (no generator inputs in ${distDir})`,
    );
    return 0;
  }
  for (const l of leaks) {
    console.error(`[check-pack-refs] leaked into ${distDir}: ${l}`);
  }
  return 1;
}

if (import.meta.main) {
  if (Deno.args.includes("--leakage")) {
    const code = await runLeakageMode(Deno.args);
    Deno.exit(code);
  }

  console.log("Checking cross-pack references...");

  const errors = await validatePackRefs("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(
        `[pack-ref] ${e.file}:${e.line}: '${e.referencedName}' (${e.referencedPack}) referenced from ${e.pack}`,
      );
    }
    console.error(`\n${errors.length} cross-pack reference violation(s).`);
    Deno.exit(1);
  } else {
    console.log("All pack references are valid.");
  }
}
