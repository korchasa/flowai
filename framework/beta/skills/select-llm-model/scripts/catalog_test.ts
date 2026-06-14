import { assert, assertEquals } from "jsr:@std/assert";
import { BENCHMARKS, CATEGORIES, resolveCategory } from "./catalog.ts";
import { parseArtificialAnalysis } from "./parse-artificial-analysis.ts";
import { parseAider } from "./parse-aider.ts";
import { parseSteel } from "./parse-steel.ts";

Deno.test("catalog: the closed category set is exactly the documented one", () => {
  assertEquals(CATEGORIES.sort(), [
    "agentic",
    "coding",
    "computer-use",
    "diff-edit",
    "general",
    "instruction",
    "long-context",
    "math",
    "swe",
    "web",
  ]);
});

Deno.test("catalog: every benchmark belongs to a known category and a known source", () => {
  const sources = new Set(["artificial-analysis", "aider", "steel"]);
  for (const b of BENCHMARKS) {
    assert(
      CATEGORIES.includes(b.category),
      `${b.benchmark}: unknown category ${b.category}`,
    );
    assert(sources.has(b.source), `${b.benchmark}: unknown source ${b.source}`);
  }
});

Deno.test("catalog: resolveCategory returns that category's benchmarks", () => {
  const coding = resolveCategory("coding").map((b) => b.benchmark).sort();
  assertEquals(coding, ["coding-index", "livecodebench", "scicode"]);
});

Deno.test("catalog: resolveCategory throws on unknown category", () => {
  let threw = false;
  try {
    resolveCategory("nonsense");
  } catch {
    threw = true;
  }
  assert(threw, "expected throw on unknown category");
});

// The bridge MUST be honest: every benchmark's (source, axis) pair has to be an
// axis the named parser actually emits — otherwise a `--benchmark` query
// silently returns nothing. Assert against inline fixtures per source.
const AA = JSON.stringify({
  data: [{
    name: "M",
    evaluations: {
      artificial_analysis_intelligence_index: 50,
      mmlu_pro: 0.7,
      gpqa: 0.6,
      hle: 0.1,
      artificial_analysis_coding_index: 40,
      livecodebench: 0.5,
      scicode: 0.3,
      artificial_analysis_math_index: 80,
      aime: 0.9,
      aime_25: 0.88,
      math_500: 0.95,
      terminalbench_hard: 0.2,
      tau2: 0.6,
      ifbench: 0.65,
      lcr: 0.3,
    },
    pricing: { price_1m_blended_3_to_1: 1 },
    median_output_tokens_per_second: 100,
  }],
});
const AIDER = "- model: X\n  pass_rate_2: 70.0\n";
const STEEL_WEB =
  `<title>WebArena | Steel.dev</title><tr><td><span class="system-name">A</span></td><td>50%</td></tr>`;
const STEEL_OS =
  `<title>OSWorld | Steel.dev</title><tr><td><span class="system-name">A</span></td><td>50%</td></tr>`;
const STEEL_SWE =
  `<title>SWE-bench Verified | Steel.dev</title><tr><td><span class="system-name">A</span></td><td>50%</td></tr>`;

Deno.test("catalog: every benchmark's (source,axis) is really emitted by its parser", () => {
  const emitted = new Set<string>();
  for (const r of parseArtificialAnalysis(AA)) {
    emitted.add(`artificial-analysis:${r.axis}`);
  }
  for (const r of parseAider(AIDER)) emitted.add(`aider:${r.axis}`);
  for (const html of [STEEL_WEB, STEEL_OS, STEEL_SWE]) {
    for (const r of parseSteel(html)) emitted.add(`steel:${r.axis}`);
  }
  for (const b of BENCHMARKS) {
    assert(
      emitted.has(`${b.source}:${b.axis}`),
      `${b.benchmark} maps to ${b.source}:${b.axis} which the parser does not emit`,
    );
  }
});
