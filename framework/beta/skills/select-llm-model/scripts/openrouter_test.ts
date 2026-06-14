import { assert, assertEquals } from "jsr:@std/assert";
import {
  parseEndpoints,
  queryModels,
  queryPrice,
  querySpeed,
  sortProviders,
} from "./openrouter.ts";

const MODELS = JSON.stringify({
  data: [
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      pricing: { prompt: "0.0000025", completion: "0.00001" },
      context_length: 128000,
    },
    {
      id: "x/cheap",
      name: "Cheap",
      pricing: { prompt: "0.0000001", completion: "0.0000002" },
      context_length: 32000,
    },
    {
      id: "x/free",
      name: "Free",
      pricing: { prompt: "-1", completion: "-1" },
      context_length: 8000,
    },
  ],
});

const ENDPOINTS = JSON.stringify({
  data: {
    id: "openai/gpt-4o",
    endpoints: [
      {
        provider_name: "Azure",
        pricing: { prompt: "0.0000025", completion: "0.00001" },
        context_length: 128000,
        uptime_last_30m: 99.94,
        uptime_last_1d: 99.5,
        status: 0,
        quantization: null,
        latency_last_30m: null,
        throughput_last_30m: null,
      },
      {
        provider_name: "OpenAI",
        pricing: {
          prompt: "0.0000025",
          completion: "0.00001",
          input_cache_read: "0.00000125",
        },
        context_length: 128000,
        uptime_last_30m: 100,
        uptime_last_1d: 100,
        status: 0,
        quantization: "fp8",
      },
    ],
  },
});

Deno.test("openrouter price: input/output/blended in $/Mtok, skips -1", () => {
  const rows = queryPrice(MODELS, "blended", undefined);
  const gpt = rows.find((r) => r.id === "openai/gpt-4o")!;
  assertEquals(gpt.input, 2.5);
  assertEquals(gpt.output, 10);
  assertEquals(gpt.blended, (3 * 2.5 + 10) / 4);
  assert(
    !rows.some((r) => r.id === "x/free"),
    "models priced -1 must be skipped",
  );
});

Deno.test("openrouter price: --sort blended puts cheapest first", () => {
  const rows = queryPrice(MODELS, "blended", undefined);
  assertEquals(rows[0].id, "x/cheap");
});

Deno.test("openrouter models: --match filters by substring", () => {
  const rows = queryModels(MODELS, "gpt", undefined);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].id, "openai/gpt-4o");
});

Deno.test("openrouter providers: per-provider input/output/uptime, cache-read optional", () => {
  const rows = parseEndpoints(ENDPOINTS);
  assertEquals(rows.length, 2);
  const openai = rows.find((r) => r.provider === "OpenAI")!;
  assertEquals(openai.input, 2.5);
  assertEquals(openai.output, 10);
  assertEquals(openai.cacheRead, 1.25);
  assertEquals(openai.uptime30m, 100);
  const azure = rows.find((r) => r.provider === "Azure")!;
  assertEquals(azure.cacheRead, undefined);
});

Deno.test("openrouter providers: latency/throughput are NOT emitted (null in API)", () => {
  const rows = parseEndpoints(ENDPOINTS);
  for (const r of rows) {
    assert(!("latency" in r), "latency must not be in provider output");
    assert(!("throughput" in r), "throughput must not be in provider output");
  }
});

Deno.test("openrouter providers: --sort price orders by input price", () => {
  const sorted = sortProviders(parseEndpoints(ENDPOINTS), "price");
  assert(sorted[0].input! <= sorted[sorted.length - 1].input!);
});

Deno.test("openrouter providers: empty endpoints throws (→ Gap)", () => {
  let threw = false;
  try {
    parseEndpoints(JSON.stringify({ data: { id: "x", endpoints: [] } }));
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("openrouter speed: median tok/s from AA, sorted desc", () => {
  const AA = JSON.stringify({
    data: [
      { name: "Slow", evaluations: {}, median_output_tokens_per_second: 50 },
      { name: "Fast", evaluations: {}, median_output_tokens_per_second: 200 },
    ],
  });
  const rows = querySpeed(AA, undefined, undefined);
  assertEquals(rows[0].model, "Fast");
  assertEquals(rows[0].speed, 200);
});
