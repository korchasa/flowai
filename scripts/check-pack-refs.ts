/**
 * Pack reference + bundle-leakage validator.
 *
 * Two modes (CLI-selected, both invoked from `deno task check` and CI):
 *
 * 1. Default — cross-pack references in source.
 *    Any pack may reference core primitives: OK
 *    Intra-pack references (same pack): OK
 *    Core referencing non-core: ERROR
 *    Non-core-A referencing non-core-B: ERROR
 *    Scans SKILL.md and agent .md files for backtick-quoted primitive names.
 *
 * 2. `--leakage [--tarball <path>]` — generator-input leakage gate
 *    (FR-SKILL-COMPOSE). Builds framework.tar locally if no tarball is given,
 *    unpacks it into a temp dir, fails with exit 1 + path list if any
 *    generator input (`framework/atoms/`, `framework/composites/`,
 *    legacy `_atom.md` / `_composite.md`, or `composites.yaml`) is present. Sister
 *    mitigation to the `tar --exclude` flags in .github/workflows/ci.yml.
 *    See documents/tasks/2026/05/generate-skills-from-atoms.md (Commit 1).
 */
import { join } from "@std/path";

export const LEAKED_FILENAMES = [
  "_atom.md",
  "_composite.md",
  "composites.yaml",
] as const;
export const LEAKED_DIRNAMES = ["atoms", "composites"] as const;
const TAR_EXCLUDES = [
  ...LEAKED_FILENAMES.map((f) => `--exclude=${f}`),
  ...LEAKED_DIRNAMES.map((d) => `--exclude=*/${d}`),
];

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

      // Match word-boundary references in any context (code, prose, comments).
      // NOTE: This catches references in prose text too, not just code/imports.
      // To avoid false positives, do not mention other packs' skill/agent names
      // verbatim — use generic descriptions instead.
      const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
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
 * basename matches one of the leak-target filenames. Used by the leakage
 * gate after unpacking the framework tarball.
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
 * Builds framework.tar from `frameworkDir` using `tar --exclude` (matching
 * .github/workflows/ci.yml), unpacks it under `outDir`, and returns the
 * unpack-root path. The output is non-reproducible — for leakage checking
 * only, NOT for release bundling.
 */
export async function buildAndUnpackTarball(
  frameworkDir: string,
  outDir: string,
): Promise<string> {
  const tarPath = join(outDir, "framework.tar");
  const buildCmd = new Deno.Command("tar", {
    args: [...TAR_EXCLUDES, "-cf", tarPath, frameworkDir],
    stdout: "piped",
    stderr: "piped",
  });
  const built = await buildCmd.output();
  if (!built.success) {
    throw new Error(
      `[check-pack-refs] tar build failed: ${
        new TextDecoder().decode(built.stderr)
      }`,
    );
  }
  const unpackDir = join(outDir, "unpacked");
  await Deno.mkdir(unpackDir, { recursive: true });
  const extractCmd = new Deno.Command("tar", {
    args: ["-xf", tarPath, "-C", unpackDir],
    stdout: "piped",
    stderr: "piped",
  });
  const extracted = await extractCmd.output();
  if (!extracted.success) {
    throw new Error(
      `[check-pack-refs] tar extract failed: ${
        new TextDecoder().decode(extracted.stderr)
      }`,
    );
  }
  return unpackDir;
}

/**
 * Verifies the CI workflow file declares the required `--exclude` flags on
 * its `tar` invocation. Static check — catches the most common regression
 * (someone editing CI and dropping the excludes) without running tar.
 */
export async function checkCiExcludes(
  workflowPath: string = ".github/workflows/ci.yml",
): Promise<string[]> {
  let content: string;
  try {
    content = await Deno.readTextFile(workflowPath);
  } catch (e) {
    throw new Error(
      `[check-pack-refs] cannot read ${workflowPath}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  const missing: string[] = [];
  for (const f of LEAKED_FILENAMES) {
    if (
      !content.includes(`--exclude='${f}'`) &&
      !content.includes(`--exclude=${f}`)
    ) {
      missing.push(f);
    }
  }
  for (const d of LEAKED_DIRNAMES) {
    if (
      !content.includes(`--exclude='*/${d}'`) &&
      !content.includes(`--exclude=*/${d}`)
    ) {
      missing.push(`*/${d}`);
    }
  }
  return missing;
}

async function runLeakageMode(args: string[]): Promise<number> {
  const tarballIdx = args.indexOf("--tarball");
  const tarballPath = tarballIdx >= 0 ? args[tarballIdx + 1] : null;
  let unpackRoot: string;
  let tmpDir: string | null = null;
  if (tarballPath) {
    tmpDir = await Deno.makeTempDir({ prefix: "flowai-leak-extract-" });
    const cmd = new Deno.Command("tar", {
      args: ["-xf", tarballPath, "-C", tmpDir],
      stdout: "piped",
      stderr: "piped",
    });
    const r = await cmd.output();
    if (!r.success) {
      console.error(
        `[check-pack-refs] failed to unpack ${tarballPath}: ${
          new TextDecoder().decode(r.stderr)
        }`,
      );
      return 1;
    }
    unpackRoot = tmpDir;
  } else {
    tmpDir = await Deno.makeTempDir({ prefix: "flowai-leak-build-" });
    unpackRoot = await buildAndUnpackTarball("framework", tmpDir);
  }
  try {
    const leaks = await findLeakedFiles(unpackRoot);
    const missingCi = await checkCiExcludes();
    if (leaks.length === 0 && missingCi.length === 0) {
      console.log(
        "[check-pack-refs] bundle leakage check passed (no generator inputs in tarball)",
      );
      return 0;
    }
    for (const l of leaks) {
      console.error(`[check-pack-refs] leaked into tarball: ${l}`);
    }
    for (const m of missingCi) {
      console.error(
        `[check-pack-refs] .github/workflows/ci.yml is missing --exclude='${m}' on the tar step`,
      );
    }
    return 1;
  } finally {
    if (tmpDir) {
      try {
        await Deno.remove(tmpDir, { recursive: true });
      } catch { /* best effort */ }
    }
  }
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
