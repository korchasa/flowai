/**
 * Candidate fetch for the pool2 funnel (FR-BENCH-SWE.POOL2).
 *
 * Pulls rows from the `nebius/SWE-rebench-leaderboard` monthly splits via the
 * HuggingFace datasets-server rows API (JSON, paginated — no Python needed)
 * and writes a compact candidate list. The vintage rule (created_at strictly
 * after the pinned model snapshot's training cutoff) is applied at SELECTION
 * time — fetch keeps `createdAt` so the cut is reproducible once the snapshot
 * is pinned in provenance. Candidates are ordered fresh-first: the newest
 * instances carry the largest post-cutoff safety margin.
 */

export interface Pool2Candidate {
  instanceId: string;
  repo: string;
  /** "YYYY-MM-DD HH:MM:SS" as published by the dataset. */
  createdAt: string;
  /** Leaderboard monthly split the row came from, e.g. "2026_03". */
  split: string;
  /** Prebuilt amd64 eval image (null when the dataset carries none). */
  imageName: string | null;
  f2p: number;
  p2p: number;
  patchBytes: number;
}

export const POOL2_CANDIDATES_PATH = "scripts/benchmark/pool2_candidates.json";

/** Monthly splits after the newest plausible Sonnet training cutoff. */
export const POOL2_SPLITS = [
  "2025_08",
  "2025_09",
  "2025_10",
  "2025_11",
  "2025_12",
  "2026_01",
  "2026_02",
  "2026_03",
];

const ROWS_API = "https://datasets-server.huggingface.co/rows";
const PAGE = 100;

function str(row: Record<string, unknown>, k: string): string {
  const v = row[k];
  if (typeof v !== "string" || v === "") {
    throw new Error(`leaderboard row missing '${k}'`);
  }
  return v;
}

/** Map one datasets-server row onto a candidate (fail fast on bad shape). */
export function toCandidate(
  row: Record<string, unknown>,
  split: string,
): Pool2Candidate {
  const f2p = row.FAIL_TO_PASS;
  const p2p = row.PASS_TO_PASS;
  return {
    instanceId: str(row, "instance_id"),
    repo: str(row, "repo"),
    createdAt: str(row, "created_at"),
    split,
    imageName: typeof row.image_name === "string" && row.image_name !== ""
      ? row.image_name
      : null,
    f2p: Array.isArray(f2p) ? f2p.length : 0,
    p2p: Array.isArray(p2p) ? p2p.length : 0,
    patchBytes: typeof row.patch === "string" ? row.patch.length : 0,
  };
}

export interface RowsPage {
  num_rows_total: number;
  rows: Array<{ row: Record<string, unknown> }>;
}

/** Injectable fetcher (tests pass a fake; CLI passes the real HTTP one). */
export type RowsFetcher = (url: string) => Promise<RowsPage>;

export const httpRowsFetcher: RowsFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`datasets-server ${res.status} for ${url}`);
  }
  return await res.json() as RowsPage;
};

/** Fetch every row of one monthly split, paginating at 100/page. */
export async function fetchSplit(
  split: string,
  fetcher: RowsFetcher,
): Promise<Pool2Candidate[]> {
  const out: Pool2Candidate[] = [];
  let offset = 0;
  while (true) {
    const url =
      `${ROWS_API}?dataset=nebius%2FSWE-rebench-leaderboard&config=default&split=${split}&offset=${offset}&length=${PAGE}`;
    const page = await fetcher(url);
    for (const { row } of page.rows) out.push(toCandidate(row, split));
    offset += page.rows.length;
    if (offset >= page.num_rows_total || page.rows.length === 0) break;
  }
  return out;
}

/** Fetch all splits and sort fresh-first (largest post-cutoff margin first). */
export async function fetchAllCandidates(
  splits: readonly string[],
  fetcher: RowsFetcher,
): Promise<Pool2Candidate[]> {
  const all: Pool2Candidate[] = [];
  for (const split of splits) {
    const cands = await fetchSplit(split, fetcher);
    console.log(`[pool2-fetch] ${split}: ${cands.length} candidate(s)`);
    all.push(...cands);
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
