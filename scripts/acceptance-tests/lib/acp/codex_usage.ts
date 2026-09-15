// [REF:fr:accept.token-usage | FR-ACCEPT.TOKEN-USAGE]
/**
 * Token usage of the agent under test, recovered from the codex rollouts.
 *
 * The ACP transport reports no usage at all — `AgentAdapter.calculateUsage`
 * returned null for every IDE until 2026-09-15, which is why every run printed
 * `Tokens: 0`. Codex itself keeps the numbers: each session writes `event_msg`
 * lines of type `token_count` into its rollout under `CODEX_HOME/sessions/`,
 * and the harness already points the agent at a per-run `CODEX_HOME`
 * (`prepareAcpCodexHome`). Reading them back costs nothing and needs no
 * protocol change.
 *
 * Two properties of that file decide the arithmetic:
 *
 * - `total_token_usage` is CUMULATIVE over the session, so only the last
 *   `token_count` of a rollout counts. Summing every event would multiply a
 *   session's cost by the number of turns it took.
 * - One run leaves SEVERAL rollouts when the agent spawns subagents (six for a
 *   `maintenance-basic` run), and they are all part of the bill, so the totals
 *   are summed ACROSS files.
 *
 * The judge is deliberately not here: FR-ACCEPT.JUDGE-APPSERVER starts its
 * threads with `ephemeral: true`, so it writes no rollout. Its counts come off
 * the protocol in `appserver_client.ts`.
 */
import { join } from "@std/path";
import { walk } from "@std/fs/walk";
import {
  addTokens,
  type TokenBreakdown,
  tokensFromRollout,
} from "../token_usage.ts";

/** Usage of ONE rollout: its last `token_count`, or null when it has none. */
export function parseRolloutUsage(jsonl: string): TokenBreakdown | null {
  let last: TokenBreakdown | null = null;
  for (const line of jsonl.split("\n")) {
    if (!line.includes('"token_count"')) continue;
    let item: { payload?: { info?: { total_token_usage?: unknown } } };
    try {
      item = JSON.parse(line);
    } catch {
      // A truncated line (a killed session flushes mid-write) is not a reason
      // to lose the counts the rest of the file carries.
      continue;
    }
    const usage = item.payload?.info?.total_token_usage;
    if (usage && typeof usage === "object") {
      last = tokensFromRollout(usage as Record<string, never>);
    }
  }
  return last;
}

/**
 * Usage of every session under one `CODEX_HOME` — the agent and its subagents.
 *
 * Null rather than zero when nothing was measured: a missing `sessions/` tree
 * (a non-codex IDE, or a run that died before its first turn) is not the same
 * claim as "this run was free", and the report must not make it.
 */
export async function collectCodexUsage(
  codexHome: string,
): Promise<TokenBreakdown | null> {
  const root = join(codexHome, "sessions");
  const files: string[] = [];
  try {
    for await (
      const e of walk(root, {
        includeDirs: false,
        match: [/rollout-.*\.jsonl$/],
      })
    ) {
      files.push(e.path);
    }
  } catch {
    return null;
  }
  files.sort();
  let total: TokenBreakdown | null = null;
  for (const f of files) {
    const one = parseRolloutUsage(await Deno.readTextFile(f));
    if (!one) continue;
    total = total ? addTokens(total, one) : one;
  }
  return total;
}
