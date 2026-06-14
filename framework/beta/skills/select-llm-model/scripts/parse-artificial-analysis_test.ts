import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseArtificialAnalysis } from "./parse-artificial-analysis.ts";

// Inline fixture in the real AA `/api/v2/data/llms/models` shape, trimmed to the
// fields the parser reads (values are real, captured from the live API).
const AA_JSON = JSON.stringify({
  status: "success",
  data: [
    {
      name: "gpt-oss-20B (high)",
      slug: "gpt-oss-20b",
      evaluations: {
        artificial_analysis_intelligence_index: 24.5,
        artificial_analysis_coding_index: 18.5,
        artificial_analysis_math_index: 89.3,
        gpqa: 0.688,
        hle: 0.098,
        livecodebench: 0.777,
        terminalbench_hard: 0.106,
        tau2: 0.602,
        mmlu_pro: 0.748,
        scicode: 0.344,
        aime_25: 0.893,
        ifbench: 0.651,
        lcr: 0.306,
      },
      pricing: { price_1m_blended_3_to_1: 0.088 },
      median_output_tokens_per_second: 252.241,
    },
    {
      name: "Borealis-3",
      slug: "borealis-3",
      evaluations: { artificial_analysis_intelligence_index: 64, gpqa: 0.5 },
      pricing: { price_1m_blended_3_to_1: 3.0 },
      median_output_tokens_per_second: 240,
    },
  ],
});

const SPA =
  `<!DOCTYPE html><html><body>RSC stream, no parseable table</body></html>`;

Deno.test("AA: extracts absorbed bench axes for a real model", () => {
  const rows = parseArtificialAnalysis(AA_JSON);
  const axes = new Set(
    rows.filter((r) => r.model === "gpt-oss-20B (high)").map((r) => r.axis),
  );
  // AA absorbs these benchmarks — no separate scrapers needed.
  for (
    const a of [
      "intelligence",
      "reasoning",
      "knowledge",
      "agentic-coding",
      "tool-use",
    ]
  ) {
    assertEquals(axes.has(a), true, `missing axis ${a}`);
  }
});

Deno.test("AA: intelligence score is the raw native value", () => {
  const rows = parseArtificialAnalysis(AA_JSON);
  const intel = rows.find((r) =>
    r.model === "gpt-oss-20B (high)" && r.axis === "intelligence"
  );
  assertEquals(intel?.score, 24.5);
  assertEquals(intel?.higherIsBetter, true);
});

Deno.test("AA: emits the expanded bench fields as axes", () => {
  const rows = parseArtificialAnalysis(AA_JSON);
  const axes = new Set(
    rows.filter((r) => r.model === "gpt-oss-20B (high)").map((r) => r.axis),
  );
  for (
    const a of ["mmlu-pro", "scicode", "math", "instruction-following", "lcr"]
  ) {
    assertEquals(axes.has(a), true, `missing expanded axis ${a}`);
  }
});

Deno.test("AA: correlated 'general' fields share a group", () => {
  const rows = parseArtificialAnalysis(AA_JSON).filter((r) =>
    r.model === "gpt-oss-20B (high)"
  );
  const groupOf = (axis: string) => rows.find((r) => r.axis === axis)?.group;
  // intelligence / mmlu-pro / reasoning / knowledge all measure "general"
  // ability — they must collapse to one Phase-3 contribution.
  assertEquals(groupOf("intelligence"), "general");
  assertEquals(groupOf("mmlu-pro"), "general");
  assertEquals(groupOf("reasoning"), "general");
});

Deno.test("AA: price axis is lower-is-better", () => {
  const rows = parseArtificialAnalysis(AA_JSON);
  const price = rows.find((r) =>
    r.model === "gpt-oss-20B (high)" && r.axis === "price"
  );
  assertEquals(price?.score, 0.088);
  assertEquals(price?.higherIsBetter, false);
});

Deno.test("AA: non-JSON body throws (→ Gap)", () => {
  assertThrows(() => parseArtificialAnalysis(SPA));
});

Deno.test("AA: JSON without .data array throws (→ Gap)", () => {
  assertThrows(() => parseArtificialAnalysis('{"status":"ok"}'));
});
