/**
 * Prototype: per-FR coverage report.
 *
 * For a given FR-ID (or all FRs), prints all evidence the spec claims:
 *   - SRS heading location
 *   - Benchmark scenarios declared via "Acceptance verified by benchmarks: ..."
 *   - Code comments referencing the FR-ID
 *   - Task files implementing the FR-ID
 *   - Latest benchmark verdict per IDE (from benchmarks/cache/)
 *
 * Usage:
 *   deno run -A scripts/check-fr-coverage.ts                  # all FRs
 *   deno run -A scripts/check-fr-coverage.ts FR-AGENT-COMMIT  # one FR
 *
 * Not wired into `deno task check` yet — exploratory tool.
 */
import { join } from "@std/path";

type FrSection = {
  id: string;
  title: string;
  srsLine: number;
  benchmarkIds: string[];
};

type CacheVerdict = {
  scenarioId: string;
  ide: string;
  pass: boolean;
  score: number;
  checksPass: number;
  checksTotal: number;
  recordedAt: string;
};

const SRS_PATH = "documents/requirements.md";
const CACHE_ROOT = "benchmarks/cache";
const FR_HEADING = /^###\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*):\s*(.*)$/;
const BENCH_LINE = /Acceptance verified by benchmarks?:\*\*\s*(.*)$/i;
const BENCH_ID = /`([a-z0-9][a-z0-9-]*)`/g;
const CODE_REF =
  /^[ \t]*(?:\/\/|#)\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/;

/** Parses SRS into per-FR sections with declared benchmark IDs. */
export function parseSrs(content: string): FrSection[] {
  const lines = content.split("\n");
  const sections: FrSection[] = [];
  let current: FrSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(FR_HEADING);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        id: headingMatch[1],
        title: headingMatch[2].trim(),
        srsLine: i + 1,
        benchmarkIds: [],
      };
      continue;
    }
    if (!current) continue;
    const benchMatch = lines[i].match(BENCH_LINE);
    if (benchMatch) {
      for (const m of benchMatch[1].matchAll(BENCH_ID)) {
        current.benchmarkIds.push(m[1]);
      }
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Scans code comments for FR references. Returns map FR-ID → [file:line]. */
async function scanCodeRefs(root: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const skip = new Set([
    "node_modules",
    ".git",
    ".claude",
    ".cursor",
    ".opencode",
    "documents",
    "benchmarks",
  ]);
  const exts = new Set([".ts", ".js", ".yml", ".yaml", ".sh"]);

  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const full = join(dir, entry.name);
      if (entry.isDirectory) {
        if (!skip.has(entry.name)) await walk(full);
        continue;
      }
      if (!entry.isFile) continue;
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0 || !exts.has(entry.name.slice(dot))) continue;

      const text = await Deno.readTextFile(full);
      const rel = full.startsWith(root + "/")
        ? full.slice(root.length + 1)
        : full;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(CODE_REF);
        if (!m) continue;
        const list = out.get(m[1]) ?? [];
        list.push(`${rel}:${i + 1}`);
        out.set(m[1], list);
      }
    }
  }
  await walk(root);
  return out;
}

/** Reads a benchmark cache file. Returns null on missing/malformed. */
async function readVerdict(
  scenarioId: string,
  pack: string,
  ide: string,
): Promise<CacheVerdict | null> {
  const path = join(CACHE_ROOT, pack, scenarioId, `${ide}.json`);
  try {
    const text = await Deno.readTextFile(path);
    const json = JSON.parse(text);
    const result = json.result ?? {};
    const checklist = result.checklistResults ?? {};
    const entries = Object.values(checklist) as { pass: boolean }[];
    return {
      scenarioId,
      ide,
      pass: result.success === true,
      score: result.score ?? 0,
      checksPass: entries.filter((e) => e.pass).length,
      checksTotal: entries.length,
      recordedAt: json.recordedAt ?? "",
    };
  } catch {
    return null;
  }
}

/** Locates cache files for a scenario across all packs/IDEs. */
async function findVerdicts(scenarioId: string): Promise<CacheVerdict[]> {
  const verdicts: CacheVerdict[] = [];
  try {
    for await (const packEntry of Deno.readDir(CACHE_ROOT)) {
      if (!packEntry.isDirectory) continue;
      const scenarioDir = join(CACHE_ROOT, packEntry.name, scenarioId);
      try {
        for await (const fileEntry of Deno.readDir(scenarioDir)) {
          if (!fileEntry.isFile || !fileEntry.name.endsWith(".json")) continue;
          const ide = fileEntry.name.slice(0, -".json".length);
          const v = await readVerdict(scenarioId, packEntry.name, ide);
          if (v) verdicts.push(v);
        }
      } catch {
        // not present in this pack
      }
    }
  } catch {
    // no cache dir
  }
  return verdicts;
}

/** Renders a single FR coverage block. */
function render(
  fr: FrSection,
  codeRefs: string[],
  verdicts: Map<string, CacheVerdict[]>,
): string {
  const out: string[] = [];
  out.push(`${fr.id}: ${fr.title}`);
  out.push(`  SRS:        ${SRS_PATH}:${fr.srsLine}`);

  if (fr.benchmarkIds.length === 0) {
    out.push(`  Benchmarks: (none declared)`);
  } else {
    out.push(`  Benchmarks (${fr.benchmarkIds.length}):`);
    for (const scenarioId of fr.benchmarkIds) {
      out.push(`    ${scenarioId}`);
      const vs = verdicts.get(scenarioId) ?? [];
      if (vs.length === 0) {
        out.push(`      (no cached verdict)`);
        continue;
      }
      for (const v of vs) {
        const status = v.pass ? "PASS" : "FAIL";
        const date = v.recordedAt.slice(0, 10);
        out.push(
          `      ${v.ide.padEnd(10)} [${status}] ${v.score}/100  ` +
            `${v.checksPass}/${v.checksTotal} checks  (${date})`,
        );
      }
    }
  }

  out.push(`  Code refs:  ${codeRefs.length}`);
  for (const ref of codeRefs.slice(0, 5)) {
    out.push(`    ${ref}`);
  }
  if (codeRefs.length > 5) {
    out.push(`    ... +${codeRefs.length - 5} more`);
  }

  const verdict = deriveVerdict(fr, codeRefs, verdicts);
  out.push(`  Verdict:    ${verdict}`);
  return out.join("\n");
}

/** Coarse verdict for the FR based on available evidence. */
function deriveVerdict(
  fr: FrSection,
  codeRefs: string[],
  verdicts: Map<string, CacheVerdict[]>,
): string {
  if (fr.benchmarkIds.length === 0 && codeRefs.length === 0) {
    return "NO EVIDENCE";
  }
  if (fr.benchmarkIds.length === 0) {
    return "CODE-ONLY (no benchmark declared)";
  }
  const allVerdicts = fr.benchmarkIds.flatMap((id) => verdicts.get(id) ?? []);
  const declared = fr.benchmarkIds.length;
  const withCache = new Set(allVerdicts.map((v) => v.scenarioId)).size;
  if (withCache < declared) {
    return `PARTIAL (${withCache}/${declared} benchmarks have cached verdicts)`;
  }
  const anyFail = allVerdicts.some((v) => !v.pass);
  return anyFail ? "FAILING" : "COVERED";
}

if (import.meta.main) {
  const filter = Deno.args[0];
  const srsText = await Deno.readTextFile(SRS_PATH);
  const sections = parseSrs(srsText);
  const targets = filter ? sections.filter((s) => s.id === filter) : sections;

  if (targets.length === 0) {
    console.error(`No FR section matched '${filter ?? "*"}' in ${SRS_PATH}.`);
    Deno.exit(1);
  }

  const codeRefs = await scanCodeRefs(Deno.cwd());

  // Preload verdicts for all scenarios we care about.
  const allScenarioIds = new Set(targets.flatMap((t) => t.benchmarkIds));
  const verdicts = new Map<string, CacheVerdict[]>();
  for (const scenarioId of allScenarioIds) {
    verdicts.set(scenarioId, await findVerdicts(scenarioId));
  }

  for (const fr of targets) {
    const refs = codeRefs.get(fr.id) ?? [];
    console.log(render(fr, refs, verdicts));
    console.log();
  }
}
