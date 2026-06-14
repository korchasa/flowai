/**
 * Parser for the OpenRouter models API (`/api/v1/models`, public, no key).
 *
 * Gives real deployment-time pricing — the cost a user actually pays when they
 * run a model through OpenRouter — plus context length. Prices are per-token
 * decimal strings; "-1" means unavailable/variable (skipped). Fetch (SKILL.md):
 *   curl -fsSL https://openrouter.ai/api/v1/models | deno run parse-openrouter.ts
 */
import {
  emit,
  num,
  obj,
  readStdin,
  round,
  type ScoreRow,
  str,
} from "./types.ts";

const SOURCE = "openrouter";

/** Per-token decimal string → $/Mtok, or undefined for "-1"/non-numeric. */
export function perMillion(v: unknown): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined; // "-1" = unavailable
  return n * 1_000_000;
}

/** One model from `/api/v1/models`, with input/output/blended $/Mtok + context. */
export interface ModelPrice {
  id: string;
  name?: string;
  input?: number;
  output?: number;
  blended?: number;
  context?: number;
}

/** Rich model extraction (drives both the CLI and the ScoreRow emitter). */
export function parseOpenRouterModels(raw: string): ModelPrice[] {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new Error("OpenRouter: response body is not JSON");
  }
  const data = obj(doc).data;
  if (!Array.isArray(data)) throw new Error("OpenRouter: missing .data array");

  const out: ModelPrice[] = [];
  for (const entry of data) {
    const m = obj(entry);
    const id = str(m.id);
    if (id === undefined) continue;
    const pricing = obj(m.pricing);
    const input = perMillion(pricing.prompt);
    const output = perMillion(pricing.completion);
    // Blended 3:1 input:output to match AA's price_1m_blended_3_to_1 convention.
    const blended = input !== undefined && output !== undefined
      ? (3 * input + output) / 4
      : undefined;
    const ctx = num(m.context_length);
    out.push({
      id,
      name: str(m.name),
      input: round(input, 4),
      output: round(output, 4),
      blended: round(blended, 4),
      context: ctx !== undefined && ctx > 0 ? ctx : undefined,
    });
  }
  return out;
}

export function parseOpenRouter(raw: string): ScoreRow[] {
  const rows: ScoreRow[] = [];
  for (const m of parseOpenRouterModels(raw)) {
    if (m.blended !== undefined) {
      rows.push({
        source: SOURCE,
        axis: "price",
        model: m.id,
        score: m.blended,
        higherIsBetter: false,
      });
    }
    if (m.context !== undefined) {
      rows.push({
        source: SOURCE,
        axis: "context",
        model: m.id,
        score: m.context,
        higherIsBetter: true,
      });
    }
  }
  return rows;
}

if (import.meta.main) {
  try {
    emit(parseOpenRouter(await readStdin()));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
