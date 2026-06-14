/**
 * `openrouter` CLI — deployment-time pricing, per-provider breakdown, speed.
 *
 * Subcommands:
 *   models    [--match <substr>] [--top N]
 *   price     [--match <substr>] [--sort blended|input|output] [--top N]
 *   providers  --model <author/slug> [--sort price|uptime]
 *   speed     [--match <substr>] [--top N] [--key K]      (AA median tok/s)
 * Global: --format json|table  --stdin | --input <file>  --limit N
 *
 * `models`/`price`/`speed` self-fetch their one URL (or read --stdin/--input);
 * `providers` needs the exact `author/slug` (resolve via `models`). Per-provider
 * latency/throughput are NOT emitted — both are `null` in the documented API.
 */
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  type ModelPrice,
  parseOpenRouterModels,
  perMillion,
} from "./parse-openrouter.ts";
import { parseArtificialAnalysis } from "./parse-artificial-analysis.ts";
import { num, obj, readStdin, round, str } from "./types.ts";

const MODELS_URL = "https://openrouter.ai/api/v1/models";
const AA_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";
const endpointsUrl = (slug: string) =>
  `https://openrouter.ai/api/v1/models/${slug}/endpoints`;

export interface ProviderRow {
  provider: string;
  input?: number;
  output?: number;
  cacheRead?: number;
  uptime30m?: number;
  uptime1d?: number;
  context?: number;
  quantization?: string;
  status?: number;
}

export interface SpeedRow {
  model: string;
  speed: number;
}

function matchModel(
  id: string,
  name: string | undefined,
  match: string | undefined,
): boolean {
  if (match === undefined) return true;
  const m = match.toLowerCase();
  return id.toLowerCase().includes(m) || (name ?? "").toLowerCase().includes(m);
}

/** `models` — id/name/context, filtered by substring. */
export function queryModels(
  raw: string,
  match: string | undefined,
  top: number | undefined,
): ModelPrice[] {
  const rows = parseOpenRouterModels(raw).filter((m) =>
    matchModel(m.id, m.name, match)
  );
  return top !== undefined ? rows.slice(0, top) : rows;
}

/** `price` — input/output/blended/context, only priced models, sorted ascending. */
export function queryPrice(
  raw: string,
  sort: "blended" | "input" | "output",
  top: number | undefined,
): ModelPrice[] {
  const rows = parseOpenRouterModels(raw).filter((m) => m[sort] !== undefined);
  rows.sort((a, b) => (a[sort] as number) - (b[sort] as number));
  return top !== undefined ? rows.slice(0, top) : rows;
}

/** `providers` — per-provider rows from `/api/v1/models/<slug>/endpoints`. */
export function parseEndpoints(raw: string): ProviderRow[] {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new Error("OpenRouter endpoints: response body is not JSON");
  }
  const endpoints = obj(obj(doc).data).endpoints;
  if (!Array.isArray(endpoints)) {
    throw new Error("OpenRouter endpoints: missing .data.endpoints");
  }

  const rows: ProviderRow[] = [];
  for (const e of endpoints) {
    const ep = obj(e);
    const provider = str(ep.provider_name);
    if (provider === undefined) continue;
    const pricing = obj(ep.pricing);
    rows.push({
      provider,
      input: round(perMillion(pricing.prompt), 4),
      output: round(perMillion(pricing.completion), 4),
      cacheRead: round(perMillion(pricing.input_cache_read), 4),
      uptime30m: round(num(ep.uptime_last_30m), 2),
      uptime1d: round(num(ep.uptime_last_1d), 2),
      context: num(ep.context_length),
      quantization: str(ep.quantization),
      status: num(ep.status),
    });
  }
  if (rows.length === 0) {
    throw new Error("OpenRouter endpoints: no provider rows");
  }
  return rows;
}

export function sortProviders(
  rows: ProviderRow[],
  sort: "price" | "uptime",
): ProviderRow[] {
  const r = [...rows];
  if (sort === "uptime") {
    r.sort((a, b) => (b.uptime30m ?? 0) - (a.uptime30m ?? 0));
  } else r.sort((a, b) => (a.input ?? Infinity) - (b.input ?? Infinity));
  return r;
}

/** `speed` — AA median tok/s (the only throughput proxy), sorted descending. */
export function querySpeed(
  raw: string,
  match: string | undefined,
  top: number | undefined,
): SpeedRow[] {
  const rows: SpeedRow[] = parseArtificialAnalysis(raw)
    .filter((r) =>
      r.axis === "speed" &&
      (match === undefined ||
        r.model.toLowerCase().includes(match.toLowerCase()))
    )
    .map((r) => ({ model: r.model, speed: r.score }));
  rows.sort((a, b) => b.speed - a.speed);
  return top !== undefined ? rows.slice(0, top) : rows;
}

// ─── CLI ───────────────────────────────────────────────────────────────────

async function fetchUrl(url: string, key: string | undefined): Promise<string> {
  const args = ["-fsSL"];
  if (url.includes("artificialanalysis.ai")) {
    if (!key) throw new Error("speed needs an AA key (--key or $AA_API_KEY)");
    args.push("-H", `x-api-key: ${key}`);
  }
  args.push(url);
  const cmd = new Deno.Command("curl", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `curl failed for ${url}: ${new TextDecoder().decode(stderr)}`,
    );
  }
  return new TextDecoder().decode(stdout);
}

function render(
  rows: unknown[],
  format: string,
  limit: number | undefined,
): string {
  const r = limit !== undefined ? rows.slice(0, limit) : rows;
  if (format === "table") {
    if (r.length === 0) return "(no rows)";
    return r.map((x) => Object.values(x as Record<string, unknown>).join("\t"))
      .join("\n");
  }
  return JSON.stringify(r);
}

async function main(argv: string[]): Promise<number> {
  const sub = argv[0];
  const flags = parseArgs(argv.slice(1), {
    string: [
      "match",
      "model",
      "sort",
      "key",
      "format",
      "input",
      "top",
      "limit",
    ],
    boolean: ["stdin"],
    default: { format: "json", key: Deno.env.get("AA_API_KEY") },
  });
  const top = flags.top !== undefined ? Number(flags.top) : undefined;
  const limit = flags.limit !== undefined ? Number(flags.limit) : undefined;
  const inputData = flags.stdin
    ? await readStdin()
    : flags.input !== undefined
    ? await Deno.readTextFile(flags.input)
    : undefined;
  const hasInput = inputData !== undefined;
  const grab = (url: string) =>
    hasInput ? Promise.resolve(inputData!) : fetchUrl(url, flags.key);

  if (sub === "models") {
    console.log(
      render(
        queryModels(await grab(MODELS_URL), flags.match, top),
        flags.format,
        limit,
      ),
    );
    return 0;
  }
  if (sub === "price") {
    const sort = (flags.sort ?? "blended") as "blended" | "input" | "output";
    console.log(
      render(
        queryPrice(await grab(MODELS_URL), sort, top),
        flags.format,
        limit,
      ),
    );
    return 0;
  }
  if (sub === "providers") {
    if (!flags.model) {
      throw new Error("providers: --model <author/slug> is required");
    }
    const sort = (flags.sort ?? "price") as "price" | "uptime";
    const raw = await grab(endpointsUrl(flags.model));
    console.log(
      render(sortProviders(parseEndpoints(raw), sort), flags.format, limit),
    );
    return 0;
  }
  if (sub === "speed") {
    console.log(
      render(
        querySpeed(await grab(AA_URL), flags.match, top),
        flags.format,
        limit,
      ),
    );
    return 0;
  }
  throw new Error(
    `unknown subcommand ${
      JSON.stringify(sub ?? "")
    } — use: models | price | providers | speed`,
  );
}

if (import.meta.main) {
  try {
    Deno.exit(await main(Deno.args));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
