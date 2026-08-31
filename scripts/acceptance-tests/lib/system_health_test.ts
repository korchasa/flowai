import { assertEquals, assertRejects } from "@std/assert";
import {
  assertHealthy,
  describeHealth,
  healthReasons,
  readHealth,
  type SystemHealth,
  SystemUnhealthyError,
  waitForHealthy,
} from "./system_health.ts";

// implements [REF:fr:accept-guards | FR-ACCEPT-GUARDS]
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

// --- waiting instead of failing (2026-09-01) ---------------------------------
//
// The gate used to have exactly one move: refuse the spawn and hand back code
// 75, which the judge then scored as a product failure against an agent that
// never ran. Four scenarios of the 2026-08-31 sweep were lost that way. The
// pressure is transient, so waiting it out costs minutes and saves the
// measurement.

/** A snapshot with everything healthy; override one field to make it sick. */
function snapshot(over: Partial<SystemHealth> = {}): SystemHealth {
  return {
    totalRamBytes: 32 * 2 ** 30,
    availableBytes: 8 * 2 ** 30,
    availablePct: 25,
    compressorBytes: 0,
    swapUsedBytes: 0,
    swapTotalBytes: 8 * 2 ** 30,
    swapPct: 0,
    load1: 2,
    cpuCount: 10,
    pageSize: 4096,
    platform: "darwin",
    ...over,
  };
}

const T = {
  minHeadroomBytes: 2 * 2 ** 30,
  swapDiscountFactor: 0.3,
  maxLoadPerCpu: 4,
};

Deno.test("healthReasons is empty for a healthy snapshot", () => {
  assertEquals(healthReasons(snapshot(), T), []);
});

Deno.test("healthReasons names the memory axis, and only it", () => {
  const r = healthReasons(
    snapshot({ availableBytes: 0, swapUsedBytes: 8 * 2 ** 30 }),
    T,
  );
  assertEquals(r.length, 1);
  assertEquals(r[0].includes("effective headroom"), true);
});

Deno.test("healthReasons names the load axis, and only it", () => {
  const r = healthReasons(snapshot({ load1: 100 }), T);
  assertEquals(r.length, 1);
  assertEquals(r[0].includes("load avg"), true);
});

Deno.test("waitForHealthy returns at once when the host is already healthy", async () => {
  let reads = 0, sleeps = 0;
  const h = await waitForHealthy(T, "ctx", {
    readFn: () => {
      reads++;
      return Promise.resolve(snapshot());
    },
    sleepFn: () => {
      sleeps++;
      return Promise.resolve();
    },
  });
  assertEquals([reads, sleeps], [1, 0]);
  assertEquals(h.platform, "darwin");
});

Deno.test("waitForHealthy polls until the pressure clears, then proceeds", async () => {
  let reads = 0, sleeps = 0;
  const h = await waitForHealthy(T, "ctx", {
    readFn: () => {
      reads++;
      return Promise.resolve(
        reads < 4
          ? snapshot({ availableBytes: 0, swapUsedBytes: 8 * 2 ** 30 })
          : snapshot(),
      );
    },
    sleepFn: () => {
      sleeps++;
      return Promise.resolve();
    },
  });
  assertEquals([reads, sleeps], [4, 3]);
  assertEquals(healthReasons(h, T), []);
});

Deno.test("waitForHealthy reports every wait so the log says why it is stalled", async () => {
  const said: string[] = [];
  let reads = 0;
  await waitForHealthy(T, "acp implement/tdd", {
    readFn: () => {
      reads++;
      return Promise.resolve(reads < 3 ? snapshot({ load1: 100 }) : snapshot());
    },
    sleepFn: () => Promise.resolve(),
    onWait: (reason) => said.push(reason),
  });
  assertEquals(said.length, 2);
  assertEquals(said[0].includes("load avg"), true);
  assertEquals(said[0].includes("acp implement/tdd"), true);
});

Deno.test("waitForHealthy waits indefinitely by default — it never gives up on its own", async () => {
  let reads = 0;
  await waitForHealthy(T, "ctx", {
    readFn: () => {
      reads++;
      return Promise.resolve(
        reads < 200 ? snapshot({ load1: 100 }) : snapshot(),
      );
    },
    sleepFn: () => Promise.resolve(),
  });
  assertEquals(reads, 200);
});

Deno.test("waitForHealthy gives up only when a caller asks for a deadline", async () => {
  let now = 0;
  await assertRejects(
    () =>
      waitForHealthy(T, "ctx", {
        timeoutMs: 1000,
        intervalMs: 400,
        readFn: () => Promise.resolve(snapshot({ load1: 100 })),
        sleepFn: (ms) => {
          now += ms;
          return Promise.resolve();
        },
        nowFn: () => now,
      }),
    SystemUnhealthyError,
  );
});

Deno.test("the give-up message says how long it waited, not just that it gave up", async () => {
  // After a deadline measured in hours, "system unhealthy" alone does not tell
  // the reader whether the host was sick for 12 hours or for one second.
  let now = 0;
  const err = await assertRejects(
    () =>
      waitForHealthy(T, "ctx", {
        timeoutMs: 60_000,
        intervalMs: 30_000,
        readFn: () => Promise.resolve(snapshot({ load1: 100 })),
        sleepFn: (ms: number) => {
          now += ms;
          return Promise.resolve();
        },
        nowFn: () => now,
      }),
    SystemUnhealthyError,
  );
  assertEquals(err.message.includes("waited 60 s without recovery"), true);
  assertEquals(err.message.includes("load avg"), true);
});

Deno.test("waitForHealthy does not poll off darwin — the gate is disabled there", async () => {
  let reads = 0;
  await waitForHealthy(T, "ctx", {
    readFn: () => {
      reads++;
      return Promise.resolve(snapshot({ platform: "other", load1: 100 }));
    },
    sleepFn: () => Promise.resolve(),
  });
  assertEquals(reads, 1);
});
