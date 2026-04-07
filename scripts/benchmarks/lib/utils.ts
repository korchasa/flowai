import { join } from "@std/path";
import { transformAgent } from "../../../cli/src/transform.ts";

const TMP_DIR = join(Deno.cwd(), "tmp");

/**
 * Writes content to a file in the specified directory. Returns the absolute path.
 * Used to persist prompt/evidence data in run directories for debugging.
 */
export async function writeRunFile(
  dir: string,
  name: string,
  content: string,
): Promise<string> {
  const filePath = join(dir, name);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

/**
 * Creates a temporary directory in ./tmp with a unique name.
 * Cleans up old directories if needed.
 */
export async function createTempDir(prefix = "bench"): Promise<string> {
  await Deno.mkdir(TMP_DIR, { recursive: true });
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const tempDir = join(TMP_DIR, `${prefix}-${uniqueId}`);
  await Deno.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Runs a git command in the specified directory.
 */
export async function runGit(cwd: string, args: string[]) {
  const cmd = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`Git command failed: git ${args.join(" ")}\n${stderr}`);
  }
  return output;
}

/**
 * Initializes a git repository in the specified directory with a default user.
 */
export async function setupGitRepo(path: string) {
  await runGit(path, ["init"]);
  await runGit(path, ["config", "user.name", "Benchmark Bot"]);
  await runGit(path, ["config", "user.email", "bot@example.com"]);
}

/**
 * Recursively copies a directory or file, skipping specified directory names.
 */
export async function copyRecursive(
  src: string,
  dest: string,
  skipDirs: string[] = [],
) {
  const stat = await Deno.stat(src);
  if (stat.isDirectory) {
    const dirName = src.split(/[\\/]/).pop();
    if (dirName && skipDirs.includes(dirName)) {
      return;
    }
    await Deno.mkdir(dest, { recursive: true });
    for await (const entry of Deno.readDir(src)) {
      await copyRecursive(
        join(src, entry.name),
        join(dest, entry.name),
        skipDirs,
      );
    }
  } else {
    await Deno.copyFile(src, dest);
  }
}

/**
 * Copies pack-structured framework/ into flat IDE config dir,
 * matching flowai CLI sync behavior:
 * - Skills: framework/<pack>/skills/<name>/ → dest/skills/<name>/ (as-is, skip benchmarks/runs/tmp)
 * - Agents: framework/<pack>/agents/<name>.md → dest/agents/<name>.md (frontmatter transformed per IDE)
 * - Hooks: framework/<pack>/hooks/<name>/ → dest/scripts/<name>/ (when present)
 */
export async function copyFrameworkToIdeDir(
  frameworkPath: string,
  ideConfigDir: string,
  ideName: string = "claude",
  allowedPacks?: string[],
) {
  const skipDirs = ["benchmarks", "runs", "tmp"];

  console.log(
    `  Copying packs: ${allowedPacks ? allowedPacks.join(", ") : "all"}`,
  );

  for await (const pack of Deno.readDir(frameworkPath)) {
    if (!pack.isDirectory) continue;

    // Filter packs if allowedPacks is specified
    if (allowedPacks && !allowedPacks.includes(pack.name)) continue;

    const packDir = join(frameworkPath, pack.name);

    // Check if this is a pack (has pack.yaml) or a legacy dir
    try {
      await Deno.stat(join(packDir, "pack.yaml"));
    } catch {
      continue; // Not a pack, skip
    }

    // Copy skills: framework/<pack>/skills/<name>/ → dest/skills/<name>/
    const skillsDir = join(packDir, "skills");
    try {
      for await (const skill of Deno.readDir(skillsDir)) {
        if (!skill.isDirectory) continue;
        await copyRecursive(
          join(skillsDir, skill.name),
          join(ideConfigDir, "skills", skill.name),
          skipDirs,
        );
      }
    } catch { /* no skills/ in pack */ }

    // Copy agents with IDE-specific frontmatter transformation
    const agentsDir = join(packDir, "agents");
    try {
      for await (const agent of Deno.readDir(agentsDir)) {
        if (!agent.isFile || !agent.name.endsWith(".md")) continue;
        const destAgentsDir = join(ideConfigDir, "agents");
        await Deno.mkdir(destAgentsDir, { recursive: true });
        const raw = await Deno.readTextFile(join(agentsDir, agent.name));
        const transformed = transformAgent(raw, ideName);
        await Deno.writeTextFile(join(destAgentsDir, agent.name), transformed);
      }
    } catch { /* no agents/ in pack */ }

    // Copy assets: framework/<pack>/assets/ → dest/assets/
    const assetsDir = join(packDir, "assets");
    try {
      await copyRecursive(assetsDir, join(ideConfigDir, "assets"), skipDirs);
    } catch { /* no assets/ in pack */ }

    // Copy hooks: framework/<pack>/hooks/<name>/ → dest/scripts/<name>/
    const hooksDir = join(packDir, "hooks");
    try {
      for await (const hook of Deno.readDir(hooksDir)) {
        if (!hook.isDirectory) continue;
        await copyRecursive(
          join(hooksDir, hook.name),
          join(ideConfigDir, "scripts", hook.name),
        );
      }
    } catch { /* no hooks/ in pack */ }
  }
}
