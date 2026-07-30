/**
 * Instance-metadata loader for pool2 (FR-BENCH-SWE.POOL2).
 *
 * The agent sandbox needs each instance's repo + base_commit + issue text.
 * Pool2 instances live in the `nebius/SWE-rebench-leaderboard` monthly splits,
 * NOT princeton Verified, so this loader reads them from the HF datasets-server
 * rows API (HTTP, no venv) and returns the same {@link InstanceData} shape the
 * dataset-agnostic sandbox/agent code already consumes. All pool2 passers sit
 * in one split (2026_03), so the loader fetches that split and filters.
 */

import type { InstanceData } from "./dataset.ts";
import { parseInstallConfig } from "./install_env.ts";
import type { RowsFetcher } from "./pool2_fetch.ts";
import { httpRowsFetcher } from "./pool2_fetch.ts";

const ROWS_API = "https://datasets-server.huggingface.co/rows";
const PAGE = 100;

function str(row: Record<string, unknown>, k: string): string {
  const v = row[k];
  return typeof v === "string" ? v : "";
}

/**
 * Load {@link InstanceData} for the given ids from one leaderboard split.
 * Fails fast if a requested id is absent from the split — a missing instance
 * is a data error, not a silently-skipped run.
 */
export async function loadPool2InstanceData(
  ids: string[],
  split: string,
  fetcher: RowsFetcher = httpRowsFetcher,
): Promise<Map<string, InstanceData>> {
  const wanted = new Set(ids);
  const found = new Map<string, InstanceData>();
  let offset = 0;
  while (found.size < wanted.size) {
    const url =
      `${ROWS_API}?dataset=nebius%2FSWE-rebench-leaderboard&config=default&split=${split}&offset=${offset}&length=${PAGE}`;
    const page = await fetcher(url);
    for (const { row } of page.rows) {
      const id = str(row, "instance_id");
      if (!wanted.has(id) || found.has(id)) continue;
      found.set(id, {
        instanceId: id,
        repo: str(row, "repo"),
        baseCommit: str(row, "base_commit"),
        problemStatement: str(row, "problem_statement"),
        version: str(row, "version"),
        // The recipe the graders use. Replayed into the sandbox venv so the
        // agent can import the package and run the suite (FR-BENCH-SWE.POOL2).
        installConfig: parseInstallConfig(row["install_config"]),
      });
    }
    offset += page.rows.length;
    if (offset >= page.num_rows_total || page.rows.length === 0) break;
  }
  const missing = [...wanted].filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `pool2 metadata: ${missing.length} id(s) absent from split ${split}: ${
        missing.join(", ")
      }`,
    );
  }
  return found;
}
