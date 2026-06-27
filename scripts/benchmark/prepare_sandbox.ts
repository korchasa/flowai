/**
 * Per-instance sandbox preparation for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * Each (instance, arm) pair needs an isolated checkout of the repo at the
 * instance's `base_commit`. To avoid re-cloning large repos, we keep one full
 * clone per repo under a cache dir and make a fast local clone into each
 * sandbox, then detach-checkout the base commit.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type { InstanceData } from "./dataset.ts";

async function git(args: string[], cwd?: string): Promise<string> {
  const cmd = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${new TextDecoder().decode(stderr)}`,
    );
  }
  return new TextDecoder().decode(stdout).trim();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Ensure a full clone of `repo` exists under `cacheRoot`; return its path. */
export async function ensureRepoCache(
  repo: string,
  cacheRoot: string,
): Promise<string> {
  await ensureDir(cacheRoot);
  const dir = join(cacheRoot, repo.replace("/", "__"));
  if (!(await pathExists(join(dir, ".git")))) {
    console.log(`[sandbox] cloning ${repo} into cache`);
    await git(["clone", `https://github.com/${repo}.git`, dir]);
  }
  return dir;
}

/**
 * Create a clean checkout of `data.repo` @ `data.baseCommit` at `sandboxDir`.
 * Reuses (and lazily populates) the repo clone cache.
 */
export async function prepareSandbox(
  data: InstanceData,
  sandboxDir: string,
  cacheRoot: string,
): Promise<void> {
  const cache = await ensureRepoCache(data.repo, cacheRoot);
  if (await pathExists(sandboxDir)) {
    await Deno.remove(sandboxDir, { recursive: true });
  }
  // Local clone: fast (hardlinked objects), full history so base_commit resolves.
  await git(["clone", "--no-hardlinks", cache, sandboxDir]);
  // If the base commit isn't in the cache yet (cache predates it), fetch it.
  try {
    await git(["cat-file", "-e", `${data.baseCommit}^{commit}`], sandboxDir);
  } catch {
    await git(["fetch", "origin", data.baseCommit], sandboxDir);
  }
  await git(["checkout", "--detach", data.baseCommit], sandboxDir);
  await git(["reset", "--hard", data.baseCommit], sandboxDir);
  await git(["clean", "-fdx"], sandboxDir);
}

/** Return the current HEAD commit of a checkout (for verification). */
export async function headCommit(repoDir: string): Promise<string> {
  return await git(["rev-parse", "HEAD"], repoDir);
}
