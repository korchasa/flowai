// Pre-flight system-health gate for the benchmark runner. Bails out before
// spawning the next agent if the host is already under enough memory or CPU
// pressure that adding another `claude` subprocess risks pushing the kernel
// VM compressor into the OOM-hang state observed on 2026-05-09 (07:50 →
// 08:53 reboot).
//
// All metrics are sourced root-free on macOS:
//   - `vm_stat`            → page accounting (free/inactive/speculative/purgeable, compressor)
//   - `sysctl hw.memsize`  → total RAM
//   - `sysctl vm.swapusage`→ swap occupancy
//   - `sysctl vm.loadavg`  → 1-min load average
//   - `sysctl hw.ncpu`     → CPU count for normalising load
//
// Defaults are tuned to abort BEFORE the host becomes unresponsive, not
// after. The memory gate uses a single combined "effective headroom"
// metric — availableRAM + freeSwap × swapDiscount — instead of two
// independent thresholds (free-RAM-percent and swap-percent). Independent
// thresholds gave false aborts when one side was tight but the other had
// plenty of capacity to absorb a single agent (~500 MB–1 GB peak). The
// combined metric models the actual question: "is there enough room for
// the next spawn without forcing the VM compressor into the OOM path?"
//
// Thresholds can be tuned (NOT disabled) via env:
// BENCH_MIN_HEADROOM_MB, BENCH_SWAP_DISCOUNT, BENCH_MAX_LOAD_PER_CPU.
// There is intentionally NO escape hatch to skip the gate entirely.
//
// What the gate does about an unhealthy host depends on who asks. Both
// spawn paths — the acceptance runner and the benchmark — call
// `waitForHealthy` BEFORE starting their clock, so transient pressure costs
// wall-clock and nothing else. `assertHealthy` inside `AcpAgent.run()` stays
// as the last resort behind them; reaching it means the host went bad in the
// gap between the wait and the spawn. Refusing used to be the ONLY move, and
// its cost was measured: a refusal reaches the judge as an empty trace, which
// it scores as a product failure against an agent that never ran, and four
// scenarios of the 2026-08-31 sweep were lost that way.
//
// Linux fallback: vm_stat / sysctl absent → returns a neutral snapshot and
// never trips. The CI sandboxes that run the framework on Linux do not need
// this guard.

export interface SystemHealth {
  totalRamBytes: number;
  availableBytes: number;
  availablePct: number;
  compressorBytes: number;
  swapUsedBytes: number;
  swapTotalBytes: number;
  swapPct: number;
  load1: number;
  cpuCount: number;
  pageSize: number;
  platform: "darwin" | "other";
}

export interface HealthThresholds {
  /** Minimum effective memory headroom (bytes) before a spawn is allowed.
   *  Headroom = availableRAM + freeSwap × swapDiscountFactor. */
  minHeadroomBytes: number;
  /** Discount applied to free swap when computing headroom. Swap is
   *  several times slower than RAM, so 1 GB of free swap is worth less
   *  than 1 GB of free RAM. Default 0.3 (NVMe swap ~3× slower for
   *  sequential, much worse for random access). */
  swapDiscountFactor: number;
  /** Trip when 1-min load average per CPU exceeds this. Independent of
   *  the memory gate — different failure mode. */
  maxLoadPerCpu: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  minHeadroomBytes: Number(Deno.env.get("BENCH_MIN_HEADROOM_MB") ?? "2048") *
    1024 * 1024,
  swapDiscountFactor: Number(Deno.env.get("BENCH_SWAP_DISCOUNT") ?? "0.3"),
  maxLoadPerCpu: Number(Deno.env.get("BENCH_MAX_LOAD_PER_CPU") ?? "4"),
};

export class SystemUnhealthyError extends Error {
  constructor(message: string, public health: SystemHealth) {
    super(message);
    this.name = "SystemUnhealthyError";
  }
}

async function sh(cmd: string, args: string[]): Promise<string> {
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

function parseVmStat(text: string): {
  pageSize: number;
  pages: Record<string, number>;
} {
  const sizeMatch = text.match(/page size of (\d+) bytes/);
  const pageSize = sizeMatch ? Number(sizeMatch[1]) : 4096;
  const pages: Record<string, number> = {};
  for (const line of text.split("\n").slice(1)) {
    const m = line.match(/^"?([^":]+)"?:\s+(\d+)\.?$/);
    if (m) pages[m[1].trim()] = Number(m[2]);
  }
  return { pageSize, pages };
}

function parseSwap(text: string): { total: number; used: number } {
  const totalM = Number(text.match(/total\s*=\s*([\d.]+)M/)?.[1] ?? "0");
  const usedM = Number(text.match(/used\s*=\s*([\d.]+)M/)?.[1] ?? "0");
  return { total: totalM * 1024 * 1024, used: usedM * 1024 * 1024 };
}

const NEUTRAL_HEALTH: SystemHealth = {
  totalRamBytes: 0,
  availableBytes: 0,
  availablePct: 100,
  compressorBytes: 0,
  swapUsedBytes: 0,
  swapTotalBytes: 0,
  swapPct: 0,
  load1: 0,
  cpuCount: 1,
  pageSize: 4096,
  platform: "other",
};

export async function readHealth(): Promise<SystemHealth> {
  if (Deno.build.os !== "darwin") return NEUTRAL_HEALTH;

  const [vmStatText, memSizeText, swapText, loadText, cpuText] = await Promise
    .all([
      sh("vm_stat", []),
      sh("sysctl", ["-n", "hw.memsize"]),
      sh("sysctl", ["-n", "vm.swapusage"]),
      sh("sysctl", ["-n", "vm.loadavg"]),
      sh("sysctl", ["-n", "hw.ncpu"]),
    ]);

  const { pageSize, pages } = parseVmStat(vmStatText);
  const totalRamBytes = Number(memSizeText.trim() || "0");

  const free = (pages["Pages free"] ?? 0) * pageSize;
  const inactive = (pages["Pages inactive"] ?? 0) * pageSize;
  const speculative = (pages["Pages speculative"] ?? 0) * pageSize;
  const purgeable = (pages["Pages purgeable"] ?? 0) * pageSize;
  const compressorBytes = (pages["Pages occupied by compressor"] ?? 0) *
    pageSize;

  const availableBytes = free + inactive + speculative + purgeable;
  const availablePct = totalRamBytes > 0
    ? (availableBytes / totalRamBytes) * 100
    : 0;

  const swap = parseSwap(swapText);
  const swapPct = swap.total > 0 ? (swap.used / swap.total) * 100 : 0;

  const load1 = Number(loadText.match(/\{\s*([\d.]+)/)?.[1] ?? "0");
  const cpuCount = Number(cpuText.trim() || "1");

  return {
    totalRamBytes,
    availableBytes,
    availablePct,
    compressorBytes,
    swapUsedBytes: swap.used,
    swapTotalBytes: swap.total,
    swapPct,
    load1,
    cpuCount,
    pageSize,
    platform: "darwin",
  };
}

export function describeHealth(h: SystemHealth): string {
  if (h.platform !== "darwin") return "platform=non-darwin (gate disabled)";
  const mb = (b: number) => (b / 1024 / 1024).toFixed(0);
  return [
    `available ${mb(h.availableBytes)} MB (${h.availablePct.toFixed(1)}%)`,
    `compressor ${mb(h.compressorBytes)} MB`,
    `swap ${mb(h.swapUsedBytes)}/${mb(h.swapTotalBytes)} MB (${
      h.swapPct.toFixed(0)
    }%)`,
    `load1 ${h.load1.toFixed(2)} on ${h.cpuCount} CPU (${
      (h.load1 / h.cpuCount).toFixed(2)
    }/CPU)`,
  ].join(", ");
}

/**
 * Effective memory headroom in bytes. Combines available RAM with discounted
 * free swap — the discount reflects swap being significantly slower than
 * RAM. Used as the single memory-pressure axis for the gate.
 */
export function effectiveHeadroomBytes(
  h: SystemHealth,
  swapDiscountFactor: number,
): number {
  const swapFree = Math.max(0, h.swapTotalBytes - h.swapUsedBytes);
  return h.availableBytes + swapFree * swapDiscountFactor;
}

/**
 * Throws `SystemUnhealthyError` if any threshold is breached. Returns the
 * health snapshot otherwise. There is no escape hatch — to relax the gate,
 * tune the thresholds via env (`BENCH_MIN_HEADROOM_MB`, `BENCH_SWAP_DISCOUNT`,
 * `BENCH_MAX_LOAD_PER_CPU`), don't disable the check.
 */
export async function assertHealthy(
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
  context = "",
): Promise<SystemHealth> {
  const h = await readHealth();
  if (h.platform !== "darwin") return h;

  const reasons = healthReasons(h, thresholds);

  if (reasons.length > 0) {
    const msg = [
      `system unhealthy${context ? ` before ${context}` : ""}: ${
        reasons.join("; ")
      }`,
      `snapshot: ${describeHealth(h)}`,
      `tune thresholds: BENCH_MIN_HEADROOM_MB, BENCH_SWAP_DISCOUNT, BENCH_MAX_LOAD_PER_CPU (cannot be disabled)`,
    ].join("\n  ");
    throw new SystemUnhealthyError(msg, h);
  }
  return h;
}

/**
 * Every threshold the snapshot breaches, one human-readable line each. Empty
 * means healthy. Split out of `assertHealthy` so the same verdict can be
 * consulted repeatedly while WAITING, not only once to refuse a spawn.
 */
export function healthReasons(
  h: SystemHealth,
  thresholds: HealthThresholds,
): string[] {
  const reasons: string[] = [];
  const mb = (b: number) => (b / 1024 / 1024).toFixed(0);

  const headroom = effectiveHeadroomBytes(h, thresholds.swapDiscountFactor);
  if (headroom < thresholds.minHeadroomBytes) {
    const swapFree = Math.max(0, h.swapTotalBytes - h.swapUsedBytes);
    reasons.push(
      `effective headroom ${mb(headroom)} MB < ${
        mb(thresholds.minHeadroomBytes)
      } MB ` +
        `(availableRAM ${mb(h.availableBytes)} MB + swapFree ${
          mb(swapFree)
        } MB × ${thresholds.swapDiscountFactor})`,
    );
  }

  const loadPerCpu = h.load1 / Math.max(1, h.cpuCount);
  if (loadPerCpu > thresholds.maxLoadPerCpu) {
    reasons.push(
      `load avg ${loadPerCpu.toFixed(2)}/CPU > ${thresholds.maxLoadPerCpu}/CPU`,
    );
  }

  return reasons;
}

/** Poll interval while waiting out memory or CPU pressure. */
export const DEFAULT_WAIT_INTERVAL_MS = 15_000;

/** How long a spawn waits for the host before giving up (operator's call,
 *  2026-09-01). Long enough that any transient shortage passes underneath it,
 *  short enough that a host wedged overnight surfaces as a failure instead of
 *  a sweep that looks busy and is not. Both spawn paths pass it. */
export const SPAWN_WAIT_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export interface WaitOptions {
  /** Gap between health reads. Default `DEFAULT_WAIT_INTERVAL_MS`. */
  intervalMs?: number;
  /** Give up after this much waiting. Omitted, the wait is unbounded: the
   *  pressure is transient and outlasting it costs minutes, while refusing
   *  costs the measurement. Both spawn paths nonetheless pass
   *  `SPAWN_WAIT_TIMEOUT_MS` — a host that has not recovered in 12 hours is
   *  not under transient pressure, and a sweep that waits silently forever is
   *  worse than one that stops and says so. */
  timeoutMs?: number;
  /** Called once per unhealthy poll, so the log says what it is stalled on
   *  instead of going quiet for minutes. */
  onWait?: (reason: string, waitedMs: number) => void;
  /** Injected by tests. */
  readFn?: () => Promise<SystemHealth>;
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
}

/**
 * Block until the host can take another agent, then return its snapshot.
 *
 * `assertHealthy` has exactly one move — refuse — and the refusal reaches the
 * judge as an empty trace, which it scores as a product failure against an
 * agent that never ran. Four scenarios of the 2026-08-31 sweep were lost that
 * way. Memory pressure is transient, so the honest response is to wait for it
 * to pass rather than to spend a scenario on it.
 *
 * Unbounded unless the caller sets `timeoutMs`; both spawn paths set it to
 * `SPAWN_WAIT_TIMEOUT_MS`. On a non-darwin host the gate is disabled, so this
 * reads once and returns.
 */
export async function waitForHealthy(
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
  context = "",
  opts: WaitOptions = {},
): Promise<SystemHealth> {
  const read = opts.readFn ?? readHealth;
  const sleep = opts.sleepFn ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.nowFn ?? Date.now;
  const interval = opts.intervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
  const startedAt = now();

  let h = await read();
  if (h.platform !== "darwin") return h;

  for (;;) {
    const reasons = healthReasons(h, thresholds);
    if (reasons.length === 0) return h;

    const waited = now() - startedAt;
    const why = `system unhealthy${context ? ` before ${context}` : ""}: ${
      reasons.join("; ")
    }`;
    if (opts.timeoutMs !== undefined && waited >= opts.timeoutMs) {
      throw new SystemUnhealthyError(
        [
          why,
          `waited ${(waited / 1000).toFixed(0)} s without recovery`,
          `snapshot: ${describeHealth(h)}`,
        ].join("\n  "),
        h,
      );
    }
    opts.onWait?.(why, waited);
    await sleep(interval);
    h = await read();
  }
}
