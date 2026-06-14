/**
 * Closed category → benchmark catalog for the `benchmarks` CLI.
 *
 * The agent learns the CATEGORIES set from SKILL.md (so `--category` can be
 * required); benchmark names are optional (omit → all benchmarks of a category).
 * Each benchmark bridges its user-facing name to the (source, parser-axis) pair
 * the underlying `parse-<source>.ts` actually emits — `catalog_test.ts` proves
 * no benchmark maps to an axis the parser never produces.
 */

import { parseArtificialAnalysis } from "./parse-artificial-analysis.ts";
import { parseAider } from "./parse-aider.ts";
import { parseSteel } from "./parse-steel.ts";
import type { ScoreRow } from "./types.ts";

export interface BenchmarkDef {
  /** Category the agent filters by (closed set, documented in SKILL.md). */
  category: string;
  /** User-facing benchmark name (output label). */
  benchmark: string;
  /** Source id — matches a `parse-<source>.ts`. */
  source: string;
  /** Internal axis the source's parser emits for this benchmark. */
  axis: string;
  /** Exact endpoint to fetch. AA benchmarks share one API url; Steel boards differ. */
  url: string;
}

const AA_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";
const AIDER_URL =
  "https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml";
const steelUrl = (slug: string) =>
  `https://leaderboard.steel.dev/leaderboards/${slug}/`;

export const BENCHMARKS: BenchmarkDef[] = [
  // general (AA)
  {
    category: "general",
    benchmark: "intelligence",
    source: "artificial-analysis",
    axis: "intelligence",
    url: AA_URL,
  },
  {
    category: "general",
    benchmark: "mmlu-pro",
    source: "artificial-analysis",
    axis: "mmlu-pro",
    url: AA_URL,
  },
  {
    category: "general",
    benchmark: "gpqa",
    source: "artificial-analysis",
    axis: "reasoning",
    url: AA_URL,
  },
  {
    category: "general",
    benchmark: "hle",
    source: "artificial-analysis",
    axis: "knowledge",
    url: AA_URL,
  },
  // coding (AA)
  {
    category: "coding",
    benchmark: "coding-index",
    source: "artificial-analysis",
    axis: "coding",
    url: AA_URL,
  },
  {
    category: "coding",
    benchmark: "livecodebench",
    source: "artificial-analysis",
    axis: "code-fresh",
    url: AA_URL,
  },
  {
    category: "coding",
    benchmark: "scicode",
    source: "artificial-analysis",
    axis: "scicode",
    url: AA_URL,
  },
  // math (AA)
  {
    category: "math",
    benchmark: "math-index",
    source: "artificial-analysis",
    axis: "math",
    url: AA_URL,
  },
  {
    category: "math",
    benchmark: "aime",
    source: "artificial-analysis",
    axis: "aime",
    url: AA_URL,
  },
  {
    category: "math",
    benchmark: "aime-25",
    source: "artificial-analysis",
    axis: "aime-25",
    url: AA_URL,
  },
  {
    category: "math",
    benchmark: "math-500",
    source: "artificial-analysis",
    axis: "math-500",
    url: AA_URL,
  },
  // agentic (AA)
  {
    category: "agentic",
    benchmark: "terminal-bench-hard",
    source: "artificial-analysis",
    axis: "agentic-coding",
    url: AA_URL,
  },
  {
    category: "agentic",
    benchmark: "tau2",
    source: "artificial-analysis",
    axis: "tool-use",
    url: AA_URL,
  },
  // instruction (AA)
  {
    category: "instruction",
    benchmark: "ifbench",
    source: "artificial-analysis",
    axis: "instruction-following",
    url: AA_URL,
  },
  // long-context (AA)
  {
    category: "long-context",
    benchmark: "lcr",
    source: "artificial-analysis",
    axis: "lcr",
    url: AA_URL,
  },
  // diff-edit (Aider)
  {
    category: "diff-edit",
    benchmark: "aider-polyglot",
    source: "aider",
    axis: "diff-edit",
    url: AIDER_URL,
  },
  // web (Steel.dev)
  {
    category: "web",
    benchmark: "webarena",
    source: "steel",
    axis: "web-agent",
    url: steelUrl("webarena"),
  },
  // computer-use (Steel.dev)
  {
    category: "computer-use",
    benchmark: "osworld",
    source: "steel",
    axis: "computer-use",
    url: steelUrl("osworld"),
  },
  // swe (Steel.dev)
  {
    category: "swe",
    benchmark: "swe-bench-verified",
    source: "steel",
    axis: "swe-bench",
    url: steelUrl("swe-bench-verified"),
  },
];

/** Parser dispatch by source id — the CLI feeds fetched bytes to the right parser. */
export const PARSER_BY_SOURCE: Record<string, (raw: string) => ScoreRow[]> = {
  "artificial-analysis": (raw) => parseArtificialAnalysis(raw),
  "aider": (raw) => parseAider(raw),
  "steel": (raw) => parseSteel(raw),
};

/** The closed category set (deduped, insertion order is not guaranteed sorted). */
export const CATEGORIES: string[] = [
  ...new Set(BENCHMARKS.map((b) => b.category)),
];

/** Benchmarks under one category; throws on an unknown category (fail-fast). */
export function resolveCategory(category: string): BenchmarkDef[] {
  const hits = BENCHMARKS.filter((b) => b.category === category);
  if (hits.length === 0) {
    throw new Error(
      `unknown category ${JSON.stringify(category)} — known: ${
        CATEGORIES.join(", ")
      }`,
    );
  }
  return hits;
}

/** A single benchmark by name; throws if unknown (fail-fast). */
export function resolveBenchmark(benchmark: string): BenchmarkDef {
  const hit = BENCHMARKS.find((b) => b.benchmark === benchmark);
  if (hit === undefined) {
    throw new Error(`unknown benchmark ${JSON.stringify(benchmark)}`);
  }
  return hit;
}
