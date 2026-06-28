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

/**
 * Acquire a coarse cross-process lock by atomically creating `lockDir` (mkdir is
 * atomic). Retries until free, steals a stale lock (older than `staleMs` — a
 * crashed holder), or throws after `timeoutMs`. Used to serialize same-repo
 * cache clones so parallel instances don't race into a half-built cache.
 */
async function acquireLock(
  lockDir: string,
  { staleMs = 600_000, pollMs = 200, timeoutMs = 600_000 } = {},
): Promise<void> {
  const start = Date.now();
  while (true) {
    try {
      await Deno.mkdir(lockDir);
      return;
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
      // Lock held — steal if its holder looks dead, else wait.
      try {
        const st = await Deno.stat(lockDir);
        const age = Date.now() - (st.mtime?.getTime() ?? 0);
        if (age > staleMs) {
          await Deno.remove(lockDir, { recursive: true }).catch(() => {});
          continue;
        }
      } catch { /* lock vanished between mkdir and stat — retry immediately */ }
      if (Date.now() - start > timeoutMs) {
        throw new Error(`timeout acquiring lock ${lockDir}`);
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
}

/**
 * Ensure a full clone of `repo` exists under `cacheRoot`; return its path.
 *
 * Parallel-safe: a fast path returns an already-built cache; otherwise a
 * per-repo lock serializes the clone and it is published atomically (clone into
 * `<dir>.tmp`, then `rename` to `<dir>`) so a concurrent caller never observes a
 * partially cloned cache (the old race left `git fetch` failing "not our ref").
 * `cloneUrl` overrides the GitHub URL (used by tests with a local source repo).
 */
export async function ensureRepoCache(
  repo: string,
  cacheRoot: string,
  { cloneUrl }: { cloneUrl?: string } = {},
): Promise<string> {
  await ensureDir(cacheRoot);
  const dir = join(cacheRoot, repo.replace("/", "__"));
  if (await pathExists(join(dir, ".git"))) return dir; // fast path, complete cache
  const url = cloneUrl ?? `https://github.com/${repo}.git`;
  const lockDir = `${dir}.lock`;
  await acquireLock(lockDir);
  try {
    // Another holder may have finished while we waited for the lock.
    if (await pathExists(join(dir, ".git"))) return dir;
    const tmp = `${dir}.tmp`;
    if (await pathExists(tmp)) await Deno.remove(tmp, { recursive: true });
    console.log(`[sandbox] cloning ${repo} into cache`);
    await git(["clone", url, tmp]);
    await Deno.rename(tmp, dir); // atomic publish (siblings → same filesystem)
  } finally {
    await Deno.remove(lockDir, { recursive: true }).catch(() => {});
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
