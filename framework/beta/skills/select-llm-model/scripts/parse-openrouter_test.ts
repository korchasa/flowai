import {
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from "jsr:@std/assert";
import { parseOpenRouter } from "./parse-openrouter.ts";

// Inline fixture in the real OpenRouter `/api/v1/models` shape (values captured
// live): gemini-2.5-flash priced normally, fusion priced "-1" (unavailable).
const OR_JSON = JSON.stringify({
  data: [
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      context_length: 1048576,
      pricing: { prompt: "0.0000003", completion: "0.0000025" },
    },
    {
      id: "openrouter/fusion",
      name: "Fusion",
      context_length: 128000,
      pricing: { prompt: "-1", completion: "-1" },
    },
  ],
});

const SPA =
  `<!DOCTYPE html><html><body>RSC stream, no parseable table</body></html>`;

Deno.test("OpenRouter: blended price for gemini-2.5-flash in $/Mtok", () => {
  const rows = parseOpenRouter(OR_JSON);
  const price = rows.find((r) =>
    r.model === "google/gemini-2.5-flash" && r.axis === "price"
  );
  // prompt 0.0000003 → 0.30 $/Mtok, completion 0.0000025 → 2.50; blended 3:1 = 0.85
  assertAlmostEquals(price?.score ?? -1, 0.85, 1e-9);
  assertEquals(price?.higherIsBetter, false);
});

Deno.test("OpenRouter: emits context axis (higher is better)", () => {
  const rows = parseOpenRouter(OR_JSON);
  const ctx = rows.find((r) =>
    r.model === "google/gemini-2.5-flash" && r.axis === "context"
  );
  assertEquals(ctx?.higherIsBetter, true);
  assertEquals((ctx?.score ?? 0) > 0, true);
});

Deno.test("OpenRouter: skips models priced -1 (unavailable)", () => {
  const rows = parseOpenRouter(OR_JSON);
  const fusion = rows.filter((r) =>
    r.model === "openrouter/fusion" && r.axis === "price"
  );
  assertEquals(fusion.length, 0);
});

Deno.test("OpenRouter: non-JSON body throws (→ Gap)", () => {
  assertThrows(() => parseOpenRouter(SPA));
});
