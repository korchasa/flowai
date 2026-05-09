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
// after. Override via env: BENCH_MIN_FREE_PCT, BENCH_MAX_SWAP_PCT,
// BENCH_MAX_LOAD_PER_CPU, BENCH_HEALTH_DISABLE=1.
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
  minAvailablePct: number;
  maxSwapPct: number;
  maxLoadPerCpu: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  minAvailablePct: Number(Deno.env.get("BENCH_MIN_FREE_PCT") ?? "10"),
  maxSwapPct: Number(Deno.env.get("BENCH_MAX_SWAP_PCT") ?? "60"),
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
 * Throws `SystemUnhealthyError` if any threshold is breached. Returns the
 * health snapshot otherwise. Set `BENCH_HEALTH_DISABLE=1` to skip.
 */
export async function assertHealthy(
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
  context = "",
): Promise<SystemHealth> {
  const h = await readHealth();
  if (h.platform !== "darwin") return h;
  if (Deno.env.get("BENCH_HEALTH_DISABLE") === "1") return h;

  const reasons: string[] = [];
  if (h.availablePct < thresholds.minAvailablePct) {
    reasons.push(
      `available memory ${
        h.availablePct.toFixed(1)
      }% < ${thresholds.minAvailablePct}%`,
    );
  }
  if (h.swapPct > thresholds.maxSwapPct) {
    reasons.push(
      `swap usage ${h.swapPct.toFixed(0)}% > ${thresholds.maxSwapPct}%`,
    );
  }
  const loadPerCpu = h.load1 / Math.max(1, h.cpuCount);
  if (loadPerCpu > thresholds.maxLoadPerCpu) {
    reasons.push(
      `load avg ${loadPerCpu.toFixed(2)}/CPU > ${thresholds.maxLoadPerCpu}/CPU`,
    );
  }

  if (reasons.length > 0) {
    const msg = [
      `system unhealthy${context ? ` before ${context}` : ""}: ${
        reasons.join("; ")
      }`,
      `snapshot: ${describeHealth(h)}`,
      `override: BENCH_HEALTH_DISABLE=1; tune via BENCH_MIN_FREE_PCT, BENCH_MAX_SWAP_PCT, BENCH_MAX_LOAD_PER_CPU`,
    ].join("\n  ");
    throw new SystemUnhealthyError(msg, h);
  }
  return h;
}
