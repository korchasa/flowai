/**
 * Generic parser for steel.dev per-benchmark agent leaderboards
 * (`https://leaderboard.steel.dev/leaderboards/<bench>/`).
 *
 * Every steel.dev benchmark page is a server-rendered table with a uniform
 * shape — model/system in `<span class="system-name">…</span>`, score in the
 * adjacent cell — so ONE adapter covers WebArena, OSWorld, GAIA, … The axis is
 * chosen from the page `<title>` (the page self-identifies its benchmark).
 *
 * IMPORTANT: steel.dev scores are SYSTEM/submission-attributed (agent scaffold +
 * model, e.g. "Claude Code + GBOX MCP"), NOT bare-model. The parser keeps the
 * submission name verbatim; SKILL.md Phase 3 must treat these as agent-system
 * scores, not raw model capability. Fetch (SKILL.md):
 *   curl -fsSL https://leaderboard.steel.dev/leaderboards/webarena/ | deno run parse-steel.ts
 * Unknown benchmark or no parseable rows → exit 1 so the source becomes a Gap.
 */
import { emit, readStdin, type ScoreRow } from "./types.ts";

const SOURCE = "steel";

/** Benchmark keyword in the page <title> → recommender axis. */
const TITLE_AXES: Array<[RegExp, string]> = [
  [/swe-?bench/i, "swe-bench"],
  [/webarena/i, "web-agent"],
  [/osworld/i, "computer-use"],
  [/gaia/i, "web-agent"],
];

export function parseSteel(raw: string): ScoreRow[] {
  const titleMatch = raw.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch?.[1] ?? "";
  const axis = TITLE_AXES.find(([re]) => re.test(title))?.[1];
  if (axis === undefined) {
    throw new Error(
      `steel: unrecognized benchmark in title ${JSON.stringify(title)}`,
    );
  }

  const rows: ScoreRow[] = [];
  // Split on table rows; within each, the submission name is cell 0 and the
  // Score is cell 1. Take the percentage from cell 1's VISIBLE TEXT (tags
  // stripped first) — a raw "first % in the row" would wrongly grab a CSS
  // bar-width attribute value (e.g. style="width:74.34%") that precedes the
  // displayed "74.3%" Score cell.
  for (const tr of raw.split(/<tr[\s>]/i).slice(1)) {
    const nameMatch = tr.match(/<span class="system-name">([^<]+)<\/span>/i);
    if (!nameMatch) continue;
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, " ")
    );
    const scoreCell = cells[1];
    if (scoreCell === undefined) continue;
    const pctMatch = scoreCell.match(/([\d.]+)\s*%/);
    if (!pctMatch) continue;
    const score = Number(pctMatch[1]);
    if (!Number.isFinite(score)) continue;
    rows.push({
      source: SOURCE,
      axis,
      model: nameMatch[1].trim(),
      score,
      higherIsBetter: true,
    });
  }
  if (rows.length === 0) throw new Error("steel: no parseable submission rows");
  return rows;
}

if (import.meta.main) {
  try {
    emit(parseSteel(await readStdin()));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
