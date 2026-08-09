/**
 * Session cost counters for benchmark runs (FR-BENCH-SWE.COST).
 *
 * Cost is always measured, never a quality criterion (FR-BENCH-V1 principle).
 * Token usage lives ONLY in the codex rollouts (every `*.jsonl` under
 * `<CODEX_HOME>/sessions/`). There are TWO such roots per instance since
 * FR-BENCH-SWE.ISOLATION split the human emulator's store away from the agent's,
 * and both sit in the OS temp root that macOS purges within days (all
 * pre-2026-07-22 campaign transcripts were lost exactly this way) — so the
 * harness harvests counters IMMEDIATELY after each session and persists them
 * durably next to the run artifacts.
 *
 * Rollout quirks this module encodes:
 * - `token_count` events carry a RUNNING TOTAL (`total_token_usage`), re-emitted
 *   after every API response → take the LAST event, never the sum;
 * - `function_call` items repeat across retries → dedupe by `call_id` (the
 *   field codex actually writes) falling back to `id`;
 * - a killed session truncates the final line → malformed lines are counted
 *   (`parseErrors`), never silently dropped.
 *
 * The Claude Code transcript reader this replaced was retired 2026-08-09 with
 * the Claude subject arm: it produced nothing on the codex path, which is the
 * only path campaigns run on.
 */

import { join } from "@std/path";
import { walk } from "@std/fs";

export interface TranscriptUsage {
  /** API responses — one `token_count` event each. */
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** Always 0 on codex, which reports no cache-creation counter. */
  cacheCreationTokens: number;
  /** Unique `function_call` items (deduped by `call_id`, else `id`). */
  toolCalls: number;
  /** Unparseable non-empty lines (e.g. the torn tail of a killed session). */
  parseErrors: number;
}

export interface SessionMetrics extends TranscriptUsage {
  wallClockMs: number;
  transcriptFiles: number;
}

export interface InstanceMetrics extends SessionMetrics {
  instanceId: string;
}

/** Per-arm cost totals for report rendering. */
export interface ArmCost extends TranscriptUsage {
  instances: number;
  wallClockMs: number;
}

const num = (o: Record<string, unknown>, k: string): number =>
  typeof o[k] === "number" ? o[k] as number : 0;

/**
 * Aggregate one codex rollout's jsonl text into usage counters.
 *
 * Shape differences from the retired Claude reader, all deliberate:
 * - codex re-emits a RUNNING TOTAL (`total_token_usage`) after every API
 *   response, so the counters are taken from the LAST such event rather than
 *   summed — summing would multiply the real cost by the number of turns;
 * - one `token_count` event is emitted per API response, so counting the events
 *   gives `apiCalls`;
 * - codex reports no cache-CREATION counter, only `cached_input_tokens` (a read).
 *   The field stays 0 rather than borrowing a number that means something else.
 */
export function usageFromRollout(text: string): TranscriptUsage {
  let latestTotal: Record<string, unknown> | undefined;
  let apiCalls = 0;
  const toolIds = new Set<string>();
  let parseErrors = 0;

  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(line) as Record<string, unknown>;
    } catch {
      parseErrors++;
      continue;
    }
    const payload = (j.payload ?? {}) as Record<string, unknown>;
    if (payload.type === "token_count") {
      const info = (payload.info ?? {}) as Record<string, unknown>;
      const total = info.total_token_usage as
        | Record<string, unknown>
        | undefined;
      if (total !== undefined) {
        latestTotal = total; // cumulative — last occurrence wins
        apiCalls++;
      }
      continue;
    }
    if (payload.type === "function_call") {
      // `call_id` is the identifier codex actually writes: measured over every
      // rollout on this host (1493 files, 43669 function_call records) 94% carry
      // `call_id` alone and no `id`. Keying on `id` alone counted zero tool
      // calls in almost every real session.
      const id = typeof payload.call_id === "string"
        ? payload.call_id
        : typeof payload.id === "string"
        ? payload.id
        : undefined;
      if (id !== undefined) toolIds.add(id);
    }
  }

  const u = latestTotal ?? {};
  return {
    apiCalls,
    inputTokens: num(u, "input_tokens"),
    outputTokens: num(u, "output_tokens"),
    cacheReadTokens: num(u, "cached_input_tokens"),
    cacheCreationTokens: 0,
    toolCalls: toolIds.size,
    parseErrors,
  };
}

/**
 * Harvest every rollout under `<codexHome>/sessions` for each store listed.
 *
 * Two stores, not one, since FR-BENCH-SWE.ISOLATION split the human emulator's
 * config root away from the agent's: the arm's cost is their SUM, which keeps
 * the emulator's tokens inside the arm's overhead exactly as they were counted
 * when both shared a directory. Reading only the agent's store would quietly
 * shrink every measured cost.
 *
 * Fails fast, naming the offending store, when a sessions dir is absent: a
 * session that produced no rollout is a harness defect, not a zero-cost run.
 */
export async function collectSessionMetrics(
  codexHomes: readonly string[],
  wallClockMs: number,
): Promise<SessionMetrics> {
  const sessionDirs: string[] = [];
  for (const home of codexHomes) {
    const dir = join(home, "sessions");
    try {
      await Deno.stat(dir);
    } catch {
      throw new Error(`no transcripts: sessions dir absent at ${dir}`);
    }
    sessionDirs.push(dir);
  }
  const totals: SessionMetrics = {
    wallClockMs,
    transcriptFiles: 0,
    apiCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls: 0,
    parseErrors: 0,
  };
  for (const dir of sessionDirs) {
    for await (
      const entry of walk(dir, { includeDirs: false, exts: [".jsonl"] })
    ) {
      const u = usageFromRollout(await Deno.readTextFile(entry.path));
      totals.transcriptFiles++;
      totals.apiCalls += u.apiCalls;
      totals.inputTokens += u.inputTokens;
      totals.outputTokens += u.outputTokens;
      totals.cacheReadTokens += u.cacheReadTokens;
      totals.cacheCreationTokens += u.cacheCreationTokens;
      totals.toolCalls += u.toolCalls;
      totals.parseErrors += u.parseErrors;
    }
  }
  return totals;
}

/**
 * Load persisted per-instance metrics from a run dir:
 * `<out>/<arm>/<instanceId>/<instanceId>.metrics.json`. Arms without any
 * metrics files are simply absent (old campaigns predate cost capture).
 */
export async function loadRunMetrics(
  outDir: string,
): Promise<Partial<Record<string, InstanceMetrics[]>>> {
  const byArm: Partial<Record<string, InstanceMetrics[]>> = {};
  for (const arm of ["baseline", "flowai"]) {
    const armDir = join(outDir, arm);
    let entries: Deno.DirEntry[];
    try {
      entries = [];
      for await (const e of Deno.readDir(armDir)) entries.push(e);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory) continue;
      const path = join(armDir, e.name, `${e.name}.metrics.json`);
      let raw: string;
      try {
        raw = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      const m = JSON.parse(raw) as SessionMetrics;
      (byArm[arm] ??= []).push({ ...m, instanceId: e.name });
    }
    byArm[arm]?.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  }
  return byArm;
}

/** Total a list of session metrics into per-arm cost counters. */
export function sumCost(list: readonly SessionMetrics[]): ArmCost {
  const t: ArmCost = {
    instances: list.length,
    wallClockMs: 0,
    apiCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls: 0,
    parseErrors: 0,
  };
  for (const m of list) {
    t.wallClockMs += m.wallClockMs;
    t.apiCalls += m.apiCalls;
    t.inputTokens += m.inputTokens;
    t.outputTokens += m.outputTokens;
    t.cacheReadTokens += m.cacheReadTokens;
    t.cacheCreationTokens += m.cacheCreationTokens;
    t.toolCalls += m.toolCalls;
    t.parseErrors += m.parseErrors;
  }
  return t;
}

/** One-line human summary for run logs. */
export function fmtCost(m: SessionMetrics): string {
  const min = (m.wallClockMs / 60_000).toFixed(1);
  const k = (n: number): string =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : `${Math.round(n / 1000)}k`;
  return `wall ${min}min api ${m.apiCalls} in ${k(m.inputTokens)}` +
    ` (cache-r ${k(m.cacheReadTokens)}) out ${k(m.outputTokens)}` +
    ` tools ${m.toolCalls}` +
    (m.parseErrors > 0 ? ` parse-errors ${m.parseErrors}` : "");
}
