/**
 * Pruning for the bench codex store (FR-BENCH-SWE.ISOLATION).
 *
 * The store moved out of the OS temp root into `~/.flowai-dev` so credentials
 * sit in one named place and a campaign's sessions stay readable afterwards
 * (user decision 2026-08-09). The cost of that is real: nothing purges the tree
 * any more, and every instance run leaves a `bench/<runKey>/.codex/sessions`
 * behind. This module is the maintainer's way to reclaim it — deliberately a
 * command they run, never something the harness does on its own, because the
 * rollouts ARE the evidence behind a campaign's cost and audit numbers.
 *
 * Deletion discipline, the rules AGENTS.md sets for a scripted `rm -rf`:
 * - dry run is the DEFAULT; removal needs an explicit `confirm`;
 * - every target is resolved and must land strictly under the store root
 *   (`assertUnderRoot`), so a symlinked or crafted run name cannot walk the
 *   deletion out of the store;
 * - the root itself and its `auth.json` are never targets — only `bench/<run>`
 *   directories are;
 * - the plan is returned in full, kept runs included, so the caller can print
 *   what survived rather than only what went.
 */

import { basename, join, resolve } from "@std/path";
import { walk } from "@std/fs";

/** The store `prepareBenchCodexHome` writes to. */
export const BENCH_STORE_ROOT = join(
  Deno.env.get("HOME") ?? "",
  ".flowai-dev",
);

export interface BenchRun {
  /** Directory name under `<root>/bench` — the instance run key. */
  name: string;
  path: string;
  /** Whole days since the directory was last touched. */
  ageDays: number;
  /** Total size of the run's files, for a report line worth reading. */
  bytes: number;
}

export interface PrunePlan {
  root: string;
  olderThanDays: number;
  dryRun: boolean;
  removed: BenchRun[];
  kept: BenchRun[];
  freedBytes: number;
}

const DAY_MS = 86_400_000;

/**
 * Refuse any deletion target that does not resolve STRICTLY inside `root`. The
 * root itself is refused too: a bug that produced an empty run name would
 * otherwise take the credentials and every campaign's transcripts with it.
 */
export function assertUnderRoot(root: string, target: string): void {
  const r = resolve(root);
  const t = resolve(target);
  if (!t.startsWith(r + "/")) {
    throw new Error(
      `refusing to delete ${t}: outside the bench store root ${r}`,
    );
  }
}

/** Sum the bytes of every file under `dir`; a vanished file counts as zero. */
async function dirBytes(dir: string): Promise<number> {
  let total = 0;
  for await (const entry of walk(dir, { includeDirs: false })) {
    try {
      total += (await Deno.stat(entry.path)).size;
    } catch {
      continue;
    }
  }
  return total;
}

/**
 * Every run under `<root>/bench`, newest first. An absent store is an empty
 * list, not an error — a machine that never ran a campaign is a normal state.
 */
export async function listBenchRuns(
  root: string,
  nowMs: number = Date.now(),
): Promise<BenchRun[]> {
  const benchDir = join(root, "bench");
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const e of Deno.readDir(benchDir)) entries.push(e);
  } catch {
    return [];
  }
  const runs: BenchRun[] = [];
  for (const e of entries) {
    if (!e.isDirectory) continue;
    const path = join(benchDir, e.name);
    const stat = await Deno.stat(path);
    const mtimeMs = stat.mtime?.getTime() ?? nowMs;
    runs.push({
      name: e.name,
      path,
      ageDays: Math.floor((nowMs - mtimeMs) / DAY_MS),
      bytes: await dirBytes(path),
    });
  }
  runs.sort((a, b) => a.ageDays - b.ageDays || a.name.localeCompare(b.name));
  return runs;
}

/**
 * Plan — and, with `confirm`, carry out — the removal of runs at least
 * `olderThanDays` old. Returns the full plan either way.
 */
export async function pruneBenchRuns(opts: {
  root?: string;
  olderThanDays: number;
  confirm?: boolean;
  nowMs?: number;
}): Promise<PrunePlan> {
  const root = opts.root ?? BENCH_STORE_ROOT;
  if (root === "" || !Number.isFinite(opts.olderThanDays)) {
    throw new Error(`prune refused: root=${root} olderThanDays must be finite`);
  }
  if (opts.olderThanDays < 0) {
    // A negative age would mean "runs from the future" — a caller that computed
    // one has a bug, and silently reading it as 0 would delete everything.
    throw new Error(
      `prune refused: olderThanDays must be >= 0, got ${opts.olderThanDays}`,
    );
  }
  const runs = await listBenchRuns(root, opts.nowMs ?? Date.now());
  const removed = runs.filter((r) => r.ageDays >= opts.olderThanDays);
  const kept = runs.filter((r) => r.ageDays < opts.olderThanDays);
  const dryRun = opts.confirm !== true;

  if (!dryRun) {
    for (const run of removed) {
      assertUnderRoot(root, run.path);
      // Belt and braces: the target must still look like a run directory.
      if (basename(run.path) !== run.name || run.name === "") {
        throw new Error(`prune refused: unexpected target ${run.path}`);
      }
      await Deno.remove(run.path, { recursive: true });
    }
  }
  return {
    root,
    olderThanDays: opts.olderThanDays,
    dryRun,
    removed,
    kept,
    freedBytes: removed.reduce((n, r) => n + r.bytes, 0),
  };
}

/** Human-readable size for a report line. */
export function fmtBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
