/**
 * `benchmarks` CLI — agent-driven benchmark queries over the source parsers.
 *
 * Subcommands:
 *   scores  --category <c> [--benchmark <b>] [--model <substr>…] [--top N] [--key K]
 *   model   --name <substr> [--category <c>] [--benchmark <b>] [--key K]
 * Global: --format json|table  --stdin | --input <file>  --limit N
 *
 * The agent knows the closed CATEGORY set from SKILL.md (so `--category` is
 * required on `scores`); benchmark names are optional (omit → all benchmarks of
 * the category). Each fetching subcommand self-fetches via `curl` unless
 * `--stdin` (or `--input <file>`) supplies bytes — acceptance tests pipe
 * `curl … | … --stdin` so the existing `curl` mock seam still fires. Any
 * failure → non-zero exit (Gap).
 */
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  type BenchmarkDef,
  BENCHMARKS,
  CATEGORIES,
  PARSER_BY_SOURCE,
  resolveBenchmark,
  resolveCategory,
} from "./catalog.ts";
import { readStdin } from "./types.ts";

export interface BenchRow {
  category: string;
  benchmark: string;
  source: string;
  model: string;
  score: number;
  higherIsBetter: boolean;
}

export interface ScoresQuery {
  category?: string;
  benchmark?: string;
  models?: string[];
  top?: number;
}

/** Resolve which benchmarks a query targets (fail-fast on unknown names). */
function targetDefs(q: ScoresQuery): BenchmarkDef[] {
  if (q.benchmark !== undefined) {
    const def = resolveBenchmark(q.benchmark);
    if (q.category !== undefined && def.category !== q.category) {
      throw new Error(
        `benchmark ${q.benchmark} is not in category ${q.category}`,
      );
    }
    return [def];
  }
  if (q.category !== undefined) return resolveCategory(q.category);
  throw new Error("need --category or --benchmark");
}

/** Apply --model substring filter (case-insensitive, OR across substrings). */
function modelMatch(model: string, models?: string[]): boolean {
  if (models === undefined || models.length === 0) return true;
  const m = model.toLowerCase();
  return models.some((s) => m.includes(s.toLowerCase()));
}

/**
 * Pure core: given raw payloads keyed by URL, produce relabelled benchmark rows.
 * Parses each needed URL once; a missing payload for a needed URL throws (Gap).
 */
export function queryScores(
  q: ScoresQuery,
  rawByUrl: Record<string, string>,
): BenchRow[] {
  const defs = targetDefs(q);
  const parsedByUrl = new Map<
    string,
    ReturnType<(typeof PARSER_BY_SOURCE)[string]>
  >();

  const out: BenchRow[] = [];
  for (const def of defs) {
    if (!parsedByUrl.has(def.url)) {
      const raw = rawByUrl[def.url];
      if (raw === undefined) {
        throw new Error(`no payload supplied for ${def.url}`);
      }
      parsedByUrl.set(def.url, PARSER_BY_SOURCE[def.source](raw));
    }
    const rows = parsedByUrl.get(def.url)!
      .filter((r) => r.axis === def.axis && modelMatch(r.model, q.models))
      .map((r): BenchRow => ({
        category: def.category,
        benchmark: def.benchmark,
        source: def.source,
        model: r.model,
        score: r.score,
        higherIsBetter: r.higherIsBetter,
      }));
    rows.sort((a, b) =>
      a.higherIsBetter ? b.score - a.score : a.score - b.score
    );
    out.push(...(q.top !== undefined ? rows.slice(0, q.top) : rows));
  }
  return out;
}

/** `model` command: one model's standings across all (or filtered) benchmarks. */
export function queryModel(
  name: string,
  q: { category?: string; benchmark?: string },
  rawByUrl: Record<string, string>,
): BenchRow[] {
  let defs: BenchmarkDef[];
  if (q.benchmark !== undefined) defs = [resolveBenchmark(q.benchmark)];
  else if (q.category !== undefined) defs = resolveCategory(q.category);
  else defs = BENCHMARKS;
  const out: BenchRow[] = [];
  for (const def of defs) {
    const raw = rawByUrl[def.url];
    if (raw === undefined) continue; // model card tolerates partial sources
    for (const r of PARSER_BY_SOURCE[def.source](raw)) {
      if (
        r.axis === def.axis &&
        r.model.toLowerCase().includes(name.toLowerCase())
      ) {
        out.push({
          category: def.category,
          benchmark: def.benchmark,
          source: def.source,
          model: r.model,
          score: r.score,
          higherIsBetter: r.higherIsBetter,
        });
      }
    }
  }
  return out;
}

// ─── CLI ───────────────────────────────────────────────────────────────────

/** Fetch one URL via curl (adds the AA key header when needed); or read --input. */
async function fetchUrl(
  url: string,
  source: string,
  key: string | undefined,
): Promise<string> {
  const args = ["-fsSL"];
  if (source === "artificial-analysis") {
    if (!key) {
      throw new Error("artificial-analysis needs a key (--key or $AA_API_KEY)");
    }
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

/** Build the rawByUrl map: from --input (single stream) or live curl per URL. */
async function gatherPayloads(
  urls: Array<{ url: string; source: string }>,
  hasInput: boolean,
  inputData: string | undefined,
  key: string | undefined,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (hasInput) {
    if (urls.length > 1) {
      throw new Error(
        "--stdin/--input supports a single source; query one benchmark/category at a time",
      );
    }
    map[urls[0].url] = inputData ?? "";
    return map;
  }
  for (const u of urls) {
    if (map[u.url] === undefined) {
      map[u.url] = await fetchUrl(u.url, u.source, key);
    }
  }
  return map;
}

function neededUrls(
  defs: BenchmarkDef[],
): Array<{ url: string; source: string }> {
  const seen = new Set<string>();
  const out: Array<{ url: string; source: string }> = [];
  for (const d of defs) {
    if (!seen.has(d.url)) {
      seen.add(d.url);
      out.push({ url: d.url, source: d.source });
    }
  }
  return out;
}

function render(
  rows: BenchRow[],
  format: string,
  limit: number | undefined,
): string {
  const r = limit !== undefined ? rows.slice(0, limit) : rows;
  if (format === "table") {
    if (r.length === 0) return "(no rows)";
    return r.map((x) => `${x.benchmark}\t${x.model}\t${x.score}\t(${x.source})`)
      .join("\n");
  }
  return JSON.stringify(r);
}

async function main(argv: string[]): Promise<number> {
  const sub = argv[0];
  const flags = parseArgs(argv.slice(1), {
    string: [
      "category",
      "benchmark",
      "name",
      "key",
      "format",
      "input",
      "top",
      "limit",
    ],
    boolean: ["stdin"],
    collect: ["model"],
    default: { format: "json", key: Deno.env.get("AA_API_KEY") },
  });
  const top = flags.top !== undefined ? Number(flags.top) : undefined;
  const limit = flags.limit !== undefined ? Number(flags.limit) : undefined;
  const hasInput = flags.stdin || flags.input !== undefined;
  const inputData = flags.stdin
    ? await readStdin()
    : flags.input !== undefined
    ? await Deno.readTextFile(flags.input)
    : undefined;

  if (sub === "scores") {
    const q: ScoresQuery = {
      category: flags.category,
      benchmark: flags.benchmark,
      models: flags.model as string[],
      top,
    };
    const defs = targetDefs(q);
    const raw = await gatherPayloads(
      neededUrls(defs),
      hasInput,
      inputData,
      flags.key,
    );
    console.log(render(queryScores(q, raw), flags.format, limit));
    return 0;
  }
  if (sub === "model") {
    if (!flags.name) throw new Error("model: --name is required");
    let defs: BenchmarkDef[];
    if (flags.benchmark) defs = [resolveBenchmark(flags.benchmark)];
    else if (flags.category) defs = resolveCategory(flags.category);
    else defs = BENCHMARKS;
    const raw = await gatherPayloads(
      neededUrls(defs),
      hasInput,
      inputData,
      flags.key,
    );
    const rows = queryModel(flags.name, {
      category: flags.category,
      benchmark: flags.benchmark,
    }, raw);
    console.log(render(rows, flags.format, limit));
    return 0;
  }
  throw new Error(
    `unknown subcommand ${
      JSON.stringify(sub ?? "")
    } — use: scores | model. Categories: ${CATEGORIES.join(", ")}`,
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
