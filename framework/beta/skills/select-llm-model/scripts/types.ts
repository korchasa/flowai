/**
 * Shared contract for `select-llm-model` source parsers.
 *
 * Every `parse-<source>.ts` reads raw fetched bytes from stdin and emits a JSON
 * array of {@link ScoreRow} to stdout. The fetch (a `curl` owned by SKILL.md)
 * stays the single mockable seam; parsers do no network of their own so their
 * logic is unit-testable against captured fixtures.
 */

/** One model's standing on one capability/cost axis, on the source's native scale. */
export interface ScoreRow {
  /** Source id, e.g. "artificial-analysis", "openrouter", "aider". */
  source: string;
  /** Capability or cost axis, e.g. "intelligence", "price", "diff-edit". */
  axis: string;
  /** Model name/slug exactly as the source reports it. */
  model: string;
  /** Raw value on the source's native scale (Phase 3 normalizes to percentile). */
  score: number;
  /** false for cost axes (cheaper is better); true for everything else. */
  higherIsBetter: boolean;
  /**
   * Optional correlation group. Axes that measure the same latent ability
   * (e.g. several "general intelligence" benchmarks) share a group so Phase 3
   * can collapse the group to a single contribution instead of double-counting.
   */
  group?: string;
}

/** Narrow an unknown to a finite number, else undefined. */
export function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Round to `dp` decimals, passing through undefined (trims float noise in output). */
export function round(n: number | undefined, dp: number): number | undefined {
  if (n === undefined) return undefined;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Narrow an unknown to a string, else undefined. */
export function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Narrow an unknown to a plain object (never null), else {}. */
export function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object"
    ? v as Record<string, unknown>
    : {};
}

/** Read all of stdin as a UTF-8 string. */
export async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Deno.stdin.readable) chunks.push(chunk);
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return new TextDecoder().decode(out);
}

/**
 * Write rows as JSON to stdout. Fail-fast: zero rows means the source yielded
 * nothing usable, so exit non-zero — the skill records it as an explicit Gap
 * rather than ranking on a fabricated value.
 */
export function emit(rows: ScoreRow[]): never | void {
  if (rows.length === 0) {
    console.error("no usable rows parsed — source becomes a Gap");
    Deno.exit(1);
  }
  console.log(JSON.stringify(rows));
}
