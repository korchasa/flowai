// Tests for process_watchdog.ts. Focuses on the orphan-escape failure mode
// observed on 2026-05-09: a previous PPID-walk implementation killed only
// direct descendants and let reparented grandchildren keep forking, which
// ultimately required a host reboot. The fixture deliberately backgrounds
// children and exits the parent so they reparent to PID 1 — a tree-walk
// would miss them; the process-group walk used by the watchdog must not.

import { assertEquals, assertGreaterOrEqual } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { listProcessGroup, startWatchdog } from "./process_watchdog.ts";

const SETPGRP_WRAPPER = fromFileUrl(
  new URL("./setpgrp_exec.py", import.meta.url),
);

interface SpawnHandle {
  pid: number;
  child: Deno.ChildProcess;
}

function spawnWrapped(script: string): SpawnHandle {
  const child = new Deno.Command("python3", {
    args: [SETPGRP_WRAPPER, "/bin/sh", "-c", script],
    stdout: "null",
    stderr: "null",
  }).spawn();
  return { pid: child.pid, child };
}

async function waitFor(
  pred: () => Promise<boolean>,
  timeoutMs: number,
  pollMs = 50,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pred()) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

async function waitForGroupSize(
  pgid: number,
  minSize: number,
  timeoutMs: number,
): Promise<number> {
  const ok = await waitFor(
    async () => (await listProcessGroup(pgid)).length >= minSize,
    timeoutMs,
  );
  if (!ok) {
    throw new Error(
      `pgid=${pgid} never reached ${minSize} members within ${timeoutMs} ms; ` +
        `last size=${(await listProcessGroup(pgid)).length}`,
    );
  }
  return pgid;
}

function killGroupSafely(pgid: number): void {
  try {
    Deno.kill(-pgid, "SIGKILL");
  } catch { /* already gone */ }
}

Deno.test({
  name: "watchdog: trips on fork-loop and kills the entire process group",
  ignore: Deno.build.os !== "darwin" && Deno.build.os !== "linux",
  async fn() {
    // Parent backgrounds 8 sleeps then exits IMMEDIATELY → all 8 reparent
    // to PID 1. A PPID-walk rooted at the parent would see zero
    // descendants once the parent is gone; the process-group walk must
    // still find them and the kill must hit them.
    const ORPHAN_FORKER = `
      for i in $(seq 1 8); do
        sleep 60 &
      done
      exit 0
    `;
    const handle = spawnWrapped(ORPHAN_FORKER);
    try {
      // Wait until the wrapper's setsid() has placed at least one child in
      // the new group. The leader (handle.pid) may itself be gone by now in
      // the orphan-forker scenario — pgrep -g still finds the orphans.
      const pgid = await waitForGroupSize(handle.pid, 1, 2000);

      let trippedCause: string | null = null;
      const wd = startWatchdog(handle.pid, {
        maxDescendants: 4,
        confirmSamples: 1,
        intervalMs: 100,
        graceMs: 200,
        maxRssBytes: 0, // disable RSS guard so fork-loop fires deterministically
        onTrip: (t) => {
          trippedCause = t.cause;
        },
      });

      // Drain parent's exit so it doesn't show as a zombie / leak the resource.
      await handle.child.status;

      // Group must still have orphans even after parent exit (proves
      // PPID-walk would have missed them).
      assertGreaterOrEqual(
        (await listProcessGroup(pgid)).length,
        8,
        "expected orphans alive in pgid after parent exit (PPID-walk would miss them)",
      );

      const cleaned = await waitFor(async () => {
        if (!trippedCause) return false;
        return (await listProcessGroup(pgid)).length === 0;
      }, 5000);
      wd.stop();

      assertEquals(trippedCause, "fork-loop");
      assertEquals(
        cleaned,
        true,
        `process group not cleaned; remaining=${
          (await listProcessGroup(pgid)).length
        }`,
      );
    } finally {
      await killGroupSafely(handle.pid);
    }
  },
});

Deno.test({
  name:
    "watchdog: rss-bloat trip kills the entire group (synthetic memory pressure)",
  ignore: Deno.build.os !== "darwin" && Deno.build.os !== "linux",
  async fn() {
    // Allocate a noticeable buffer in python and sleep — gives the watchdog
    // a real RSS to measure. 80 MiB is comfortably above the per-test RSS
    // ceiling we set below (10 MiB) on every reasonable host.
    const BLOATER =
      `python3 -c "import time; b=bytearray(80*1024*1024); time.sleep(60)"`;
    const handle = spawnWrapped(BLOATER);
    try {
      // Wait until the wrapper's setsid() has placed at least one child in
      // the new group. The leader (handle.pid) may itself be gone by now in
      // the orphan-forker scenario — pgrep -g still finds the orphans.
      const pgid = await waitForGroupSize(handle.pid, 1, 2000);

      let trippedCause: string | null = null;
      const wd = startWatchdog(handle.pid, {
        maxDescendants: 1000, // disable fork guard for this test
        maxRssBytes: 10 * 1024 * 1024, // 10 MiB ceiling
        confirmSamples: 1,
        intervalMs: 200,
        graceMs: 200,
        onTrip: (t) => {
          trippedCause = t.cause;
        },
      });

      const cleaned = await waitFor(async () => {
        if (!trippedCause) return false;
        return (await listProcessGroup(pgid)).length === 0;
      }, 8000);
      wd.stop();

      assertEquals(trippedCause, "rss-bloat");
      assertEquals(cleaned, true, "rss-bloat trip did not clean group");
    } finally {
      await killGroupSafely(handle.pid);
      try {
        await handle.child.status;
      } catch { /* already collected */ }
    }
  },
});
