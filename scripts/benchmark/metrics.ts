/**
 * Session cost counters for benchmark runs (FR-BENCH-SWE.COST).
 *
 * Cost is always measured, never a quality criterion (FR-BENCH-V1 principle).
 * Token usage lives ONLY in the bench-home Claude Code transcripts
 * (every `*.jsonl` under `.claude/projects/`), and bench-home sits in the OS temp root
 * that macOS purges within days (all pre-2026-07-22 campaign transcripts were
 * lost exactly this way) — so the harness harvests counters IMMEDIATELY after
 * each session and persists them durably next to the run artifacts.
 *
 * Transcript quirks this module encodes:
 * - one API response spans multiple jsonl lines sharing `message.id`, each
 *   carrying a cumulative `usage` → dedupe by id, LAST occurrence wins;
 * - `tool_use` content blocks repeat across those lines → dedupe by their
 *   own `toolu_*` block id;
 * - a killed session truncates the final line → malformed lines are counted
 *   (`parseErrors`), never silently dropped.
 */

import { join } from "@std/path";
import { walk } from "@std/fs";

export interface TranscriptUsage {
  /** Unique assistant API responses (deduped by message id). */
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** Unique tool_use blocks (deduped by toolu id). */
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

/** Aggregate one transcript's jsonl text into usage counters. */
export function usageFromTranscript(text: string): TranscriptUsage {
  const usageById = new Map<string, Record<string, unknown>>();
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
    if (j.type !== "assistant") continue;
    const msg = (j.message ?? {}) as Record<string, unknown>;
    const id = typeof msg.id === "string" ? msg.id : undefined;
    const usage = msg.usage as Record<string, unknown> | undefined;
    if (id !== undefined && usage !== undefined) {
      usageById.set(id, usage); // cumulative — last occurrence wins
    }
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (b.type === "tool_use" && typeof b.id === "string") toolIds.add(b.id);
    }
  }

  const totals = {
    apiCalls: usageById.size,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    toolCalls: toolIds.size,
    parseErrors,
  };
  for (const u of usageById.values()) {
    totals.inputTokens += num(u, "input_tokens");
    totals.outputTokens += num(u, "output_tokens");
    totals.cacheReadTokens += num(u, "cache_read_input_tokens");
    totals.cacheCreationTokens += num(u, "cache_creation_input_tokens");
  }
  return totals;
}

/**
 * Harvest every transcript under `<benchHome>/.claude/projects` (main session
 * + subagents + the flowai arm's judge-gate CLI, which shares bench-home so
 * its tokens land in the flowai arm's overhead — by design). Fails fast when
 * the projects dir is absent: a session that produced no transcript is a
 * harness defect, not a zero-cost run.
 */
export async function collectBenchHomeMetrics(
  benchHome: string,
  wallClockMs: number,
): Promise<SessionMetrics> {
  const projects = join(benchHome, ".claude", "projects");
  try {
    await Deno.stat(projects);
  } catch {
    throw new Error(`no transcripts: projects dir absent at ${projects}`);
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
  for await (
    const entry of walk(projects, { includeDirs: false, exts: [".jsonl"] })
  ) {
    const u = usageFromTranscript(await Deno.readTextFile(entry.path));
    totals.transcriptFiles++;
    totals.apiCalls += u.apiCalls;
    totals.inputTokens += u.inputTokens;
    totals.outputTokens += u.outputTokens;
    totals.cacheReadTokens += u.cacheReadTokens;
    totals.cacheCreationTokens += u.cacheCreationTokens;
    totals.toolCalls += u.toolCalls;
    totals.parseErrors += u.parseErrors;
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
