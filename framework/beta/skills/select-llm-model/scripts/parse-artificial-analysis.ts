/**
 * Parser for the Artificial Analysis API (`/api/v2/data/llms/models`).
 *
 * AA is the PRIMARY source: its API already absorbs the individual benchmarks
 * (GPQA, HLE, LiveCodeBench, Terminal-Bench-hard, τ²-bench, …) plus its own
 * blended price and median throughput — so the recommender needs no separate
 * scraper for those. Fetch (SKILL.md): the page is a JS SPA, so use the API:
 *   curl -fsSL -H "x-api-key: $AA_API_KEY" \
 *     https://artificialanalysis.ai/api/v2/data/llms/models | deno run parse-artificial-analysis.ts
 * Unset key → SKILL.md records a Gap; this parser never runs on the SPA HTML.
 */
import { emit, num, obj, readStdin, type ScoreRow, str } from "./types.ts";

const SOURCE = "artificial-analysis";

/**
 * AA `evaluations` field → recommender axis (+ optional correlation group).
 * Higher is better for all of these. Fields measuring the same latent ability
 * carry a `group` so Phase 3 collapses the group to one contribution instead of
 * triple-counting "general intelligence" / "math" / "coding" / "agentic".
 * Ungrouped axes (instruction-following, lcr) stand alone.
 */
const EVAL_AXES: Record<string, { axis: string; group?: string }> = {
  artificial_analysis_intelligence_index: {
    axis: "intelligence",
    group: "general",
  },
  mmlu_pro: { axis: "mmlu-pro", group: "general" },
  gpqa: { axis: "reasoning", group: "general" },
  hle: { axis: "knowledge", group: "general" },
  artificial_analysis_coding_index: { axis: "coding", group: "coding" },
  livecodebench: { axis: "code-fresh", group: "coding" },
  scicode: { axis: "scicode", group: "coding" },
  artificial_analysis_math_index: { axis: "math", group: "math" },
  aime: { axis: "aime", group: "math" },
  aime_25: { axis: "aime-25", group: "math" },
  math_500: { axis: "math-500", group: "math" },
  terminalbench_hard: { axis: "agentic-coding", group: "agentic" },
  tau2: { axis: "tool-use", group: "agentic" },
  ifbench: { axis: "instruction-following" },
  lcr: { axis: "lcr" },
};

export function parseArtificialAnalysis(raw: string): ScoreRow[] {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new Error("AA: response body is not JSON");
  }
  const data = obj(doc).data;
  if (!Array.isArray(data)) throw new Error("AA: missing .data array");

  const rows: ScoreRow[] = [];
  for (const entry of data) {
    const m = obj(entry);
    const model = str(m.name) ?? str(m.slug);
    if (model === undefined) continue;

    const evals = obj(m.evaluations);
    for (const [field, { axis, group }] of Object.entries(EVAL_AXES)) {
      const score = num(evals[field]);
      if (score !== undefined) {
        rows.push({
          source: SOURCE,
          axis,
          model,
          score,
          higherIsBetter: true,
          group,
        });
      }
    }

    const price = num(obj(m.pricing).price_1m_blended_3_to_1);
    if (price !== undefined) {
      rows.push({
        source: SOURCE,
        axis: "price",
        model,
        score: price,
        higherIsBetter: false,
      });
    }

    const speed = num(m.median_output_tokens_per_second);
    if (speed !== undefined) {
      rows.push({
        source: SOURCE,
        axis: "speed",
        model,
        score: speed,
        higherIsBetter: true,
      });
    }
  }
  return rows;
}

if (import.meta.main) {
  try {
    emit(parseArtificialAnalysis(await readStdin()));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
