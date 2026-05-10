import { assertEquals, assertRejects } from "@std/assert";
import {
  assertHealthy,
  describeHealth,
  readHealth,
  SystemUnhealthyError,
} from "./system_health.ts";

// implements [FR-BENCH-GUARDS](../../../documents/requirements.md#fr-bench-guards-resource-guards-for-spawned-agents)
// pre-flight system-health gate. The gate intentionally has
// NO env-var escape hatch (no BENCH_HEALTH_DISABLE) — thresholds can be
// tuned via env, but the gate cannot be skipped. These tests pin that
// contract.

Deno.test("readHealth returns a snapshot with non-negative numbers", async () => {
  const h = await readHealth();
  assertEquals(typeof h.totalRamBytes, "number");
  assertEquals(h.availablePct >= 0 && h.availablePct <= 100, true);
  assertEquals(h.swapPct >= 0 && h.swapPct <= 100, true);
  assertEquals(h.cpuCount >= 1, true);
});

Deno.test("describeHealth returns the platform-disabled string off darwin", async () => {
  if (Deno.build.os === "darwin") return; // skip on darwin
  const h = await readHealth();
  assertEquals(describeHealth(h).includes("platform=non-darwin"), true);
});

Deno.test("assertHealthy throws SystemUnhealthyError when headroom is below threshold on darwin", async () => {
  if (Deno.build.os !== "darwin") return; // gate only active on darwin
  // Force the gate to trip: require Number.MAX_SAFE_INTEGER bytes of headroom.
  await assertRejects(
    () =>
      assertHealthy({
        minHeadroomBytes: Number.MAX_SAFE_INTEGER,
        swapDiscountFactor: 0.3,
        maxLoadPerCpu: 1000,
      }),
    SystemUnhealthyError,
  );
});

Deno.test("assertHealthy passes when headroom is comfortably above threshold", async () => {
  if (Deno.build.os !== "darwin") return;
  // Require only 1 byte — this should always pass on a non-degenerate host.
  await assertHealthy({
    minHeadroomBytes: 1,
    swapDiscountFactor: 0.3,
    maxLoadPerCpu: 1000,
  });
});

Deno.test("assertHealthy error message lists current tunable env vars (NOT removed ones)", async () => {
  if (Deno.build.os !== "darwin") return;
  try {
    await assertHealthy({
      minHeadroomBytes: Number.MAX_SAFE_INTEGER,
      swapDiscountFactor: 0.3,
      maxLoadPerCpu: 1000,
    });
    throw new Error("expected throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Current tune knobs MUST be mentioned.
    assertEquals(msg.includes("BENCH_MIN_HEADROOM_MB"), true);
    assertEquals(msg.includes("BENCH_SWAP_DISCOUNT"), true);
    assertEquals(msg.includes("BENCH_MAX_LOAD_PER_CPU"), true);
    // Removed env vars MUST NOT be mentioned.
    assertEquals(
      msg.includes("BENCH_HEALTH_DISABLE"),
      false,
      "error message must not mention removed BENCH_HEALTH_DISABLE",
    );
    assertEquals(
      msg.includes("BENCH_MIN_FREE_PCT"),
      false,
      "old BENCH_MIN_FREE_PCT replaced by BENCH_MIN_HEADROOM_MB",
    );
    assertEquals(
      msg.includes("BENCH_MAX_SWAP_PCT"),
      false,
      "old BENCH_MAX_SWAP_PCT folded into combined headroom",
    );
  }
});

Deno.test("BENCH_HEALTH_DISABLE has NO effect — gate trips even when set", async () => {
  if (Deno.build.os !== "darwin") return;
  Deno.env.set("BENCH_HEALTH_DISABLE", "1");
  try {
    await assertRejects(
      () =>
        assertHealthy({
          minHeadroomBytes: Number.MAX_SAFE_INTEGER,
          swapDiscountFactor: 0.3,
          maxLoadPerCpu: 1000,
        }),
      SystemUnhealthyError,
      undefined,
      "BENCH_HEALTH_DISABLE must be a no-op — the env-var bypass was intentionally removed",
    );
  } finally {
    Deno.env.delete("BENCH_HEALTH_DISABLE");
  }
});

Deno.test("effectiveHeadroomBytes correctly combines availableRAM with discounted swap", async () => {
  // Pure unit test on a synthetic snapshot — no platform dependency.
  const { effectiveHeadroomBytes } = await import("./system_health.ts");
  const synthetic = {
    totalRamBytes: 16 * 1024 * 1024 * 1024,
    availableBytes: 1000 * 1024 * 1024, // 1000 MB
    availablePct: 6.1,
    compressorBytes: 0,
    swapUsedBytes: 7000 * 1024 * 1024,
    swapTotalBytes: 10000 * 1024 * 1024,
    swapPct: 70,
    load1: 0,
    cpuCount: 10,
    pageSize: 16384,
    platform: "darwin" as const,
  };
  // freeSwap = 3000 MB; discount 0.3 → 900 MB swap-equivalent
  // headroom = 1000 + 900 = 1900 MB
  const headroom = effectiveHeadroomBytes(synthetic, 0.3);
  const headroomMB = headroom / 1024 / 1024;
  // Allow ±1 MB for rounding in the multiplication chain
  assertEquals(Math.round(headroomMB), 1900);
});
