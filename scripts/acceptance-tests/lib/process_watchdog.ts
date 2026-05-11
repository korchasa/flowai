// Per-spawned-agent resource watchdog.
//
// Two independent guards run on the same poll loop:
//
//   1. fork-loop guard — kills the agent process group when the member
//      count crosses `maxDescendants + 1` for `confirmSamples` consecutive
//      samples. Background: on 2026-05-09 a benchmarked skill recursively
//      spawned ~720 `deno test` descendants in 90 s, exhausting RAM and
//      hanging WindowServer.
//
//   2. bloat-OOM guard — kills the agent process group when the SUM of
//      RSS across all group members crosses `maxRssBytes` for
//      `confirmSamples` consecutive samples. Same incident class but the
//      cause is one fat process (V8 heap growth, leak), not a fork
//      explosion. Required because `setrlimit RLIMIT_AS/RLIMIT_DATA` is
//      useless against V8 binaries on macOS (V8 over-reserves virtual
//      address space; `RLIMIT_RSS` is not enforced by the kernel).
//
// **Process group, not process tree.** The agent is spawned through
// `setpgrp_exec.py`, which calls `os.setsid()` before `execvp(claude, …)`.
// The agent becomes the leader of a new process group with PGID == PID;
// every descendant inherits this PGID. Membership and kill operations use
// `pgrep -g <pgid>` and `kill -- -<pgid>` respectively. This catches
// orphans that have re-parented to PID 1 — a tree-walk via PPID does not.
// The earlier PPID-walk implementation killed only direct descendants and
// allowed reparented grandchildren to keep forking after the trip
// (observed on 2026-05-09 12:12 → forced reboot).
//
// Defaults — `maxDescendants=5`, `maxRssBytes=6 GiB`, `intervalMs=500`,
// `confirmSamples=2` — are tuned tight: a healthy agent run keeps 2-3
// group members and < 2 GiB resident. The 500 ms × 2 = 1 s reaction
// window was chosen after a 2026-05-09 12:12 test where intervalMs=2000
// caught a fork-loop at 35 descendants — late enough that swap had
// already grown from 2 GiB to 6 GiB. At 500 ms, the same scenario would
// trip near 10 descendants, before measurable swap pressure. Thresholds are
// tunable (NOT disable-able) via env: BENCH_MAX_DESCENDANTS, BENCH_MAX_RSS_GB,
// BENCH_WATCHDOG_INTERVAL_MS, BENCH_WATCHDOG_CONFIRM. There is no env-var
// escape hatch to skip the watchdog. Tests that exercise SpawnedAgent's
// lifecycle pass `disabled: true` programmatically via WatchdogOptions —
// production callers cannot bypass via environment.

export interface WatchdogOptions {
  maxDescendants?: number; // default 5
  maxRssBytes?: number; // default 6 GiB; 0 = disable RSS guard
  intervalMs?: number; // default 500
  confirmSamples?: number; // default 2 (consecutive overshoots before killing)
  graceMs?: number; // default 1500 (between SIGTERM and SIGKILL)
  onTrip?: (reason: WatchdogTrip) => void;
  /** Programmatic-only no-op. Tests use this to exercise SpawnedAgent
   *  lifecycle without wrapping the spawn in setpgrp_exec.py. Production
   *  callers MUST NOT set this — see header comment. */
  disabled?: boolean;
}

export type WatchdogTripCause = "fork-loop" | "rss-bloat";

export interface WatchdogTrip {
  cause: WatchdogTripCause;
  reason: string;
  rootPid: number;
  descendantCount: number;
  descendants: number[];
  /** Sum of RSS across root + descendants, in bytes. */
  totalRssBytes: number;
  /** Threshold that was crossed (count for fork-loop, bytes for rss-bloat). */
  threshold: number;
  killedPids: number[];
  trippedAt: Date;
}

export interface WatchdogHandle {
  stop(): void;
  trip(): WatchdogTrip | null; // populated once watchdog has fired
  isStopped(): boolean;
}

const DEFAULTS = {
  maxDescendants: Number(Deno.env.get("BENCH_MAX_DESCENDANTS") ?? "5"),
  maxRssBytes: Number(Deno.env.get("BENCH_MAX_RSS_GB") ?? "6") * 1024 * 1024 *
    1024,
  intervalMs: Number(Deno.env.get("BENCH_WATCHDOG_INTERVAL_MS") ?? "500"),
  confirmSamples: Number(Deno.env.get("BENCH_WATCHDOG_CONFIRM") ?? "2"),
  graceMs: 1500,
};

/**
 * Reads the resident set size (bytes) for the given PIDs. Missing PIDs
 * (already exited) contribute 0. Uses `ps -o pid=,rss=` which is portable
 * across macOS and Linux. RSS from `ps` is in KiB.
 */
export async function readTotalRssBytes(pids: number[]): Promise<number> {
  if (pids.length === 0) return 0;
  const out = await runCmd("ps", ["-o", "pid=,rss=", "-p", pids.join(",")]);
  let total = 0;
  for (const line of out.trim().split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const kib = Number(parts[1]);
    if (Number.isFinite(kib)) total += kib * 1024;
  }
  return total;
}

/**
 * Returns the process group id (PGID) of the given PID, or `null` if the
 * process no longer exists. Reads `ps -o pgid= -p <pid>`.
 */
export async function getPgid(pid: number): Promise<number | null> {
  const out = await runCmd("ps", ["-o", "pgid=", "-p", String(pid)]);
  const n = Number(out.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lists every process in the given process group, INCLUDING the leader.
 * Catches orphans that have reparented to PID 1 — they keep the original
 * PGID. Returns `[]` if the group is empty (all members exited).
 */
export async function listProcessGroup(pgid: number): Promise<number[]> {
  if (!pgid) return [];
  const out = await runCmd("pgrep", ["-g", String(pgid)]);
  const pids: number[] = [];
  for (const line of out.trim().split("\n")) {
    const n = Number(line.trim());
    if (Number.isFinite(n) && n > 0) pids.push(n);
  }
  return pids;
}

async function runCmd(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "null",
    }).output();
    return new TextDecoder().decode(stdout);
  } catch {
    return "";
  }
}

/**
 * Sends `signal` to every member of `pgid` via the kernel's group-signal
 * semantics: a `kill(2)` syscall with a negative pid targets the whole
 * group atomically, regardless of parent-child relationships. Uses
 * `Deno.kill(-pgid, …)` directly — verified on macOS Sequoia and Linux
 * to dispatch to the group, not error. Guards against pgid ≤ 1 so we
 * never target init or the caller's own group.
 */
function signalGroup(pgid: number, signal: Deno.Signal): void {
  if (pgid <= 1) return;
  try {
    Deno.kill(-pgid, signal);
  } catch (e) {
    // ESRCH (no such process / empty group) is expected after the kernel
    // has already cleaned up everyone — not an error for us.
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
}

async function killProcessGroup(
  pgid: number,
  graceMs: number,
  abortSignal?: AbortSignal,
): Promise<number[]> {
  if (pgid <= 1) return [];
  const before = await listProcessGroup(pgid);
  signalGroup(pgid, "SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, graceMs);
    abortSignal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
  signalGroup(pgid, "SIGKILL");
  return before;
}

/**
 * Starts a watchdog for `rootPid`. Returns a handle whose `stop()` MUST be
 * called when the agent finishes normally, otherwise the watchdog keeps
 * polling until the process disappears.
 */
export function startWatchdog(
  rootPid: number,
  opts: WatchdogOptions = {},
): WatchdogHandle {
  const cfg = { ...DEFAULTS, ...opts };
  if (opts.disabled) {
    return {
      stop: () => {},
      trip: () => null,
      isStopped: () => true,
    };
  }

  let stopped = false;
  let trip: WatchdogTrip | null = null;
  let forkOvershoots = 0;
  let rssOvershoots = 0;
  let pendingTimer: number | undefined;
  /** PGID of the agent process group; resolved lazily on the first tick. */
  let agentPgid: number | null = null;
  const rssGuardEnabled = cfg.maxRssBytes > 0;
  // Lets stop() cancel an in-flight kill-grace setTimeout so callers don't
  // see a Deno test resource leak when the kill resolves naturally before
  // the test exits.
  const killAbort = new AbortController();

  const tripNow = async (
    cause: WatchdogTripCause,
    reason: string,
    members: number[],
    totalRssBytes: number,
    threshold: number,
  ) => {
    // Publish trip BEFORE killing so observers see the verdict the moment
    // the process dies (kill grace period would otherwise race the agent's
    // exit-status resolver).
    trip = {
      cause,
      reason,
      rootPid,
      // For the trip record, "descendants" excludes the root itself to keep
      // the previous semantics consumers may rely on.
      descendantCount: Math.max(0, members.length - 1),
      descendants: members.filter((p) => p !== rootPid),
      totalRssBytes,
      threshold,
      killedPids: [],
      trippedAt: new Date(),
    };
    stopped = true;
    try {
      opts.onTrip?.(trip);
    } catch { /* notification must not crash watchdog */ }
    const killed = agentPgid
      ? await killProcessGroup(agentPgid, cfg.graceMs, killAbort.signal)
      : [];
    if (trip) trip.killedPids = killed;
  };

  const tick = async () => {
    if (stopped) return;

    // Resolve PGID lazily — the agent is spawned via setpgrp_exec.py, which
    // calls setsid() before exec, so PGID == agent's PID. Try `getPgid`
    // first (covers the case where the wrapper layer changes); if the
    // leader has already exited (orphan-only group), assume PGID == rootPid
    // — guaranteed by the setsid contract — and proceed to scan the group.
    if (agentPgid === null) {
      agentPgid = (await getPgid(rootPid)) ?? rootPid;
    }

    let members: number[] = [];
    try {
      members = await listProcessGroup(agentPgid);
    } catch {
      // ignore — try again next tick
    }

    let totalRss = 0;
    if (rssGuardEnabled) {
      try {
        totalRss = await readTotalRssBytes(members);
      } catch {
        // ignore — try again next tick
      }
    }

    const descendantCount = Math.max(0, members.length - 1);

    // fork-loop check
    if (descendantCount > cfg.maxDescendants) {
      forkOvershoots += 1;
      if (forkOvershoots >= cfg.confirmSamples) {
        await tripNow(
          "fork-loop",
          `fork-loop guard: ${descendantCount} descendants of pid=${rootPid} ` +
            `pgid=${agentPgid} (threshold=${cfg.maxDescendants}, ` +
            `${forkOvershoots} consecutive samples)`,
          members,
          totalRss,
          cfg.maxDescendants,
        );
        return;
      }
    } else {
      forkOvershoots = 0;
    }

    // bloat-OOM (RSS) check
    if (rssGuardEnabled && totalRss > cfg.maxRssBytes) {
      rssOvershoots += 1;
      if (rssOvershoots >= cfg.confirmSamples) {
        const mb = (b: number) => (b / 1024 / 1024).toFixed(0);
        await tripNow(
          "rss-bloat",
          `rss-bloat guard: group RSS ${mb(totalRss)} MB across ` +
            `${members.length} pids in pgid=${agentPgid} ` +
            `(threshold=${
              mb(cfg.maxRssBytes)
            } MB, ${rssOvershoots} consecutive samples)`,
          members,
          totalRss,
          cfg.maxRssBytes,
        );
        return;
      }
    } else {
      rssOvershoots = 0;
    }

    if (!stopped) {
      pendingTimer = setTimeout(() => void tick(), cfg.intervalMs);
    }
  };

  // First sample on next tick (gives the root process time to start).
  pendingTimer = setTimeout(() => void tick(), cfg.intervalMs);

  return {
    stop: () => {
      stopped = true;
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer);
        pendingTimer = undefined;
      }
      killAbort.abort();
    },
    trip: () => trip,
    isStopped: () => stopped,
  };
}
