/**
 * Parser for the Aider Polyglot leaderboard (diff-edit axis).
 *
 * Repo-backed, rock-solid: the leaderboard is clean YAML in the aider repo, and
 * this axis (apply-a-diff editing) is NOT covered by Artificial Analysis. Fetch:
 *   curl -fsSL https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml \
 *     | deno run parse-aider.ts
 * `pass_rate_2` is the headline success rate; on duplicate model rows keep the best.
 */
import { parse as parseYaml } from "jsr:@std/yaml";
import { emit, num, obj, readStdin, type ScoreRow, str } from "./types.ts";

const SOURCE = "aider";

export function parseAider(raw: string): ScoreRow[] {
  const doc = parseYaml(raw); // throws on malformed YAML → Gap
  if (!Array.isArray(doc)) return [];

  const best = new Map<string, number>();
  for (const entry of doc) {
    const e = obj(entry);
    const model = str(e.model);
    const rate = num(e.pass_rate_2);
    if (model === undefined || rate === undefined) continue;
    const prev = best.get(model);
    if (prev === undefined || rate > prev) best.set(model, rate);
  }

  return [...best].map(([model, score]) => ({
    source: SOURCE,
    axis: "diff-edit",
    model,
    score,
    higherIsBetter: true,
  }));
}

if (import.meta.main) {
  try {
    emit(parseAider(await readStdin()));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
