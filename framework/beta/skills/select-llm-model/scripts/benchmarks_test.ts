import { assert, assertEquals } from "jsr:@std/assert";
import { queryScores } from "./benchmarks.ts";

// queryScores is the pure core: given already-fetched raw payloads keyed by URL,
// it resolves the category/benchmark filter, parses, filters by axis, relabels
// to benchmark names, and applies model/top filters. No network here.
const AA = JSON.stringify({
  data: [
    {
      name: "Alpha",
      evaluations: {
        artificial_analysis_coding_index: 80,
        livecodebench: 0.9,
        scicode: 0.5,
      },
      pricing: { price_1m_blended_3_to_1: 1 },
    },
    {
      name: "Beta",
      evaluations: {
        artificial_analysis_coding_index: 60,
        livecodebench: 0.7,
        scicode: 0.4,
      },
      pricing: { price_1m_blended_3_to_1: 2 },
    },
  ],
});
const AA_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";

Deno.test("benchmarks: --category coding returns all 3 coding benchmarks, relabelled", () => {
  const rows = queryScores({ category: "coding" }, { [AA_URL]: AA });
  const benches = new Set(rows.map((r) => r.benchmark));
  assertEquals(benches, new Set(["coding-index", "livecodebench", "scicode"]));
  // price/intelligence etc. must NOT leak in — only the category's benchmarks.
  assert(!rows.some((r) => r.benchmark === "price"));
  assertEquals(rows.every((r) => r.category === "coding"), true);
});

Deno.test("benchmarks: --benchmark narrows within the fetched payload", () => {
  const rows = queryScores({ category: "coding", benchmark: "livecodebench" }, {
    [AA_URL]: AA,
  });
  assertEquals(
    new Set(rows.map((r) => r.benchmark)),
    new Set(["livecodebench"]),
  );
  assertEquals(rows.length, 2);
});

Deno.test("benchmarks: --model filters models by substring (case-insensitive)", () => {
  const rows = queryScores({ category: "coding", models: ["alph"] }, {
    [AA_URL]: AA,
  });
  assertEquals(rows.every((r) => r.model === "Alpha"), true);
});

Deno.test("benchmarks: --top keeps the N highest per benchmark", () => {
  const rows = queryScores({
    category: "coding",
    benchmark: "coding-index",
    top: 1,
  }, { [AA_URL]: AA });
  assertEquals(rows.length, 1);
  assertEquals(rows[0].model, "Alpha"); // 80 > 60
});

Deno.test("benchmarks: unknown category throws (→ Gap)", () => {
  let threw = false;
  try {
    queryScores({ category: "nope" }, {});
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("benchmarks: missing payload for a needed url throws (→ Gap)", () => {
  let threw = false;
  try {
    queryScores({ category: "coding" }, {}); // no AA payload provided
  } catch {
    threw = true;
  }
  assert(threw);
});
