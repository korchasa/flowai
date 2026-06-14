/**
 * Source registry for `select-llm-model`. Single source of truth for which
 * leaderboards the skill fetches in Phase 2; the SKILL.md Phase-2 table mirrors
 * this list by hand and `sources_test.ts` enforces file-level parity (each
 * {@link SourceDef.id} ⟷ a sibling `parse-<id>.ts`).
 *
 * Only sources with a CONFIRMED stable endpoint live here. Sources whose data
 * sits behind a JS SPA / Google Sheet / unconfirmed endpoint are documented as
 * Gaps in SKILL.md, never registered with a fabricated parser (honesty rule).
 */

/** Reliability tier: 1 repo/static-table (no key), 2 keyed API, 3 best-effort SPA. */
export type Tier = 1 | 2 | 3;

export interface SourceDef {
  /** Stable id — MUST equal the `parse-<id>.ts` filename stem. */
  id: string;
  /** Human label used in citations (e.g. "Artificial Analysis"). */
  name: string;
  /** Axes this source can emit. Correlation grouping is per-row (see ScoreRow.group). */
  axes: string[];
  /** Stable endpoint(s); the SKILL.md Phase-2 pipe mirrors these. */
  urls: string[];
  /** Reliability tier. */
  tier: Tier;
  /** Env var holding the API key, when the source is key-gated. */
  needsKey?: string;
}

export const SOURCES: SourceDef[] = [
  {
    id: "artificial-analysis",
    name: "Artificial Analysis",
    // AA absorbs ~15 benchmarks behind one keyed call + blended price + speed.
    axes: [
      "intelligence",
      "mmlu-pro",
      "reasoning",
      "knowledge",
      "coding",
      "code-fresh",
      "scicode",
      "math",
      "aime",
      "aime-25",
      "math-500",
      "agentic-coding",
      "tool-use",
      "instruction-following",
      "lcr",
      "price",
      "speed",
    ],
    urls: ["https://artificialanalysis.ai/api/v2/data/llms/models"],
    tier: 2,
    needsKey: "AA_API_KEY",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    // Real deployment price (blended $/Mtok) + context window. Public, no key.
    axes: ["price", "context"],
    urls: ["https://openrouter.ai/api/v1/models"],
    tier: 1,
  },
  {
    id: "aider",
    name: "Aider Polyglot",
    // Diff-edit ability — not covered by AA. Clean repo-backed YAML.
    axes: ["diff-edit"],
    urls: [
      "https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml",
    ],
    tier: 1,
  },
  {
    id: "steel",
    name: "Steel.dev Agent Leaderboards",
    // Server-rendered per-benchmark tables (uniform structure). One adapter,
    // axis chosen from the page title. Adds agent axes AA lacks. NB: scores are
    // SYSTEM/submission-attributed (agent scaffold + model), not bare model.
    axes: ["web-agent", "computer-use", "swe-bench"],
    urls: [
      "https://leaderboard.steel.dev/leaderboards/webarena/",
      "https://leaderboard.steel.dev/leaderboards/osworld/",
      "https://leaderboard.steel.dev/leaderboards/swe-bench-verified/",
      "https://leaderboard.steel.dev/leaderboards/gaia/",
    ],
    tier: 3,
  },
];
