/**
 * Result cells (FR-BENCH-SWE.CELLS).
 *
 * One cell = one measurement configuration, keyed by
 * `(ide, arm + flowai fingerprint, model, effort)`. The fingerprint lives in
 * the KEY, so a bare run and a flowai run — or two flowai versions — are
 * different cells by construction and cannot be blended.
 *
 * A cell is a directory: `cell.json` (the header that makes the numbers
 * re-interpretable months later) plus append-only `tasks.jsonl` (one row per
 * (rep, instance), later rows win — the same rule that makes the predictions
 * file resumable).
 *
 * The rule the schema exists for: every task carries an explicit status, so an
 * instance the harness never ran is `pending`, not absent. Measured 2026-07-25,
 * a health-abort storm left 45 instances un-run and they simply vanished from
 * the predictions file — any pass rate over it silently described a smaller,
 * luckier set. `passRate` refuses a partial set unless the caller says so.
 *
 * Verdicts are never re-derived here: they are swebench's own report, decomposed
 * by `retro.ts::classifyReport`.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type { GradeClass } from "./retro.ts";
import { ACP_AGENTS } from "@acceptance-tests/acp/registry.ts";
import { baselineTask, commandPrefixFor } from "./operator.ts";

export const CELLS_ROOT = "scripts/benchmark/cells";

/** Identity of a measurement configuration. */
export interface CellKey {
  ide: string;
  /** `baseline` (bare IDE) or `flowai`. */
  arm: string;
  /** Framework fingerprint (commit sha). Null for the bare arm — nothing to pin. */
  framework: string | null;
  model: string;
  effort: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Directory name for a cell. Every key component appears, so no two
 * configurations can land in one record.
 */
export function cellId(key: CellKey): string {
  return [
    key.ide,
    key.arm,
    key.framework ?? "none",
    key.model,
    key.effort,
  ].map(slug).join("-");
}

/** Why a measured task produced no patch. Absent when a patch exists. */
export type EmptyReason =
  | "agent-gave-up"
  | "timeout"
  | "health-abort"
  | "auth-fail"
  | "setup-fail";

/**
 * `measured` — the agent ran and the result is graded or gradeable.
 * `pending` — never fairly attempted (guard abort, auth outage, clone blip);
 *   counts as neither a solve nor a miss.
 * `excluded` — the instance itself is defective (e.g. the dataset points at a
 *   commit the remote repo does not have); it leaves the denominator.
 */
export type TaskStatus = "measured" | "pending" | "excluded";

/** swebench's verdict, decomposed. Mirrors `retro.ts::InstanceGrade`. */
export interface TaskVerdict {
  resolved: boolean;
  solved: boolean;
  noRegression: boolean;
  f2pPass: number;
  f2pFail: number;
  p2pPass: number;
  p2pFail: number;
  p2pFailedTests: string[];
  klass: GradeClass;
}

export interface TaskWebAudit {
  fetches: number;
  searches: number;
  oracleAdjacent: number;
}

export interface TaskRecord {
  rep: number;
  instanceId: string;
  status: TaskStatus;
  verdict?: TaskVerdict;
  exitCode?: number;
  turns?: number;
  wallClockMs?: number;
  patchBytes?: number;
  emptyReason?: EmptyReason;
  /** Cell-relative paths — the evidence behind the verdict. */
  patchPath?: string;
  judgePath?: string;
  web?: TaskWebAudit;
  /** Required when status is `excluded`; states the defect. */
  excludedReason?: string;
  /** Why a task is still pending (guard abort, auth outage, clone blip). */
  pendingReason?: string;
}

export interface CellTaskSet {
  dataset: string;
  split: string;
  /** Pinned commit of the grading fork — the verdict producer. */
  forkCommit: string;
  ids: string[];
  checksum: string;
}

export interface CellAgent {
  /** Exact model snapshot; null when the vendor exposes only a tier. */
  modelSnapshot: string | null;
  ideVersion: string | null;
  /** ACP bridge version (codex); null when the IDE speaks ACP itself. */
  bridgeVersion: string | null;
}

export interface CellHarness {
  maxSteps: number;
  stepTimeoutMs: number;
  /** Hash of the task text handed to the agent — wording moves results. */
  promptHash: string;
  /** Harness commit that produced these numbers. */
  commit: string;
}

export interface CellEnv {
  hostname: string;
  arch: string;
  cpuCount: number;
  ramBytes: number;
  dockerVersion: string | null;
  rosetta: boolean;
}

/** Timing and the conditions the rep ran under. */
export interface CellRep {
  rep: number;
  startedAt: string;
  finishedAt: string | null;
  concurrency: number;
  healthAborts: number;
  backoffWaits: number;
}

export interface CellHeader {
  schemaVersion: 1;
  cellId: string;
  key: CellKey;
  taskSet: CellTaskSet;
  agent: CellAgent;
  judge: { model: string; effort: string };
  harness: CellHarness;
  env: CellEnv;
  reps: CellRep[];
}

export type CellHeaderInput = Omit<
  CellHeader,
  "schemaVersion" | "cellId" | "key"
>;

export interface Cell {
  header: CellHeader;
  /** One row per (rep, instance) — later rows win. */
  tasks: TaskRecord[];
}

/**
 * Identity of the task set, independent of listing order: two cells over the
 * same instances are comparable, a different set is a different measurement.
 */
export async function taskSetChecksum(ids: readonly string[]): Promise<string> {
  const text = [...ids].sort().join("\n");
  const bytes = new TextEncoder().encode(text);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface RunOutcome {
  rep: number;
  instanceId: string;
  /** Session exit code (75 = health guard, 124 = timeout). */
  code: number;
  /** Working-tree diff the session left behind. */
  patch: string;
  wallClockMs?: number;
  turns?: number;
  /** ACP token expired mid-session. */
  authFailed?: boolean;
  /** Clone/DNS blip before the agent ran. */
  setupFailed?: boolean;
  patchPath?: string;
}

/**
 * Turn one session's outcome into a task row.
 *
 * Two rules, both paid for in bad numbers this week:
 *   - a session that was never FAIRLY attempted (health guard, auth outage,
 *     clone blip) is `pending`, never a miss — with one exception: if a patch
 *     exists, the model did engage, so it is a real measurement;
 *   - an empty patch from a session that DID run must name its cause, so
 *     "gave up" is never mistaken for "was cut short".
 */
export function taskRecordFromRun(o: RunOutcome): TaskRecord {
  const patch = o.patch ?? "";
  const empty = patch.trim() === "";
  const base: TaskRecord = {
    rep: o.rep,
    instanceId: o.instanceId,
    status: "measured",
    exitCode: o.code,
    patchBytes: patch.length,
  };
  if (o.wallClockMs !== undefined) base.wallClockMs = o.wallClockMs;
  if (o.turns !== undefined) base.turns = o.turns;
  if (o.patchPath !== undefined) base.patchPath = o.patchPath;

  if (empty) {
    const unfair: [boolean, EmptyReason, string][] = [
      [o.code === 75, "health-abort", "system_health aborted the spawn"],
      [o.authFailed === true, "auth-fail", "ACP token expired mid-session"],
      [o.setupFailed === true, "setup-fail", "transient clone/DNS failure"],
    ];
    for (const [hit, reason, text] of unfair) {
      if (hit) {
        return {
          ...base,
          status: "pending",
          pendingReason: `${reason}: ${text} — never fairly attempted`,
        };
      }
    }
    base.emptyReason = o.code === 124 ? "timeout" : "agent-gave-up";
  }
  return base;
}

/**
 * ACP bridge version pinned for an IDE, or null when the IDE speaks ACP itself.
 * Read from the registry's launch args, so a bridge bump cannot slip into a
 * cell unnoticed.
 */
export function bridgeVersionFor(ide: string): string | null {
  const spec = ACP_AGENTS[ide as keyof typeof ACP_AGENTS];
  for (const arg of spec?.launch.args ?? []) {
    const m = arg.match(/@[^@\s]+\/[^@\s]+@(\d+\.\d+\.\d+)/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Hash of the TEMPLATE handed to the agent (placeholders instead of the actual
 * repo and issue), plus the IDE's skill-invocation prefix. Wording moves
 * results, so a silent prompt edit must show up as a different cell input.
 */
export async function promptHashFor(ide: string): Promise<string> {
  const template = baselineTask("<REPO>", "<ISSUE>") +
    `\nprefix=${commandPrefixFor(ide)}`;
  return (await taskSetChecksum([template])).slice(0, 16);
}

async function capture(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { code, stdout } = await new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "null",
    }).output();
    if (code !== 0) return null;
    return new TextDecoder().decode(stdout).trim() || null;
  } catch {
    return null; // tool absent — recorded as unknown, never guessed
  }
}

/** Harness commit that produced a measurement. `unknown` when git cannot say. */
export async function currentCommit(): Promise<string> {
  return await capture("git", ["rev-parse", "--short", "HEAD"]) ?? "unknown";
}

/**
 * Snapshot of the machine. Docker's version comes from the daemon, so it is
 * null when the daemon is down — which itself is worth recording, since a cell
 * graded without Docker has no verdicts.
 */
export async function readCellEnv(): Promise<CellEnv> {
  const [hostname, dockerVersion, ram, rosetta] = await Promise.all([
    capture("hostname", ["-s"]),
    capture("docker", ["version", "--format", "{{.Server.Version}}"]),
    capture("sysctl", ["-n", "hw.memsize"]),
    capture("sysctl", ["-n", "sysctl.proc_translated"]),
  ]);
  return {
    hostname: hostname ?? "unknown",
    arch: Deno.build.arch,
    cpuCount: navigator.hardwareConcurrency,
    ramBytes: Number(ram ?? 0),
    dockerVersion,
    // arm64 host running amd64 task images — the pool2 grading path.
    rosetta: Deno.build.arch === "aarch64" && rosetta !== null,
  };
}

export async function writeHeader(
  dir: string,
  key: CellKey,
  input: CellHeaderInput,
): Promise<CellHeader> {
  await ensureDir(dir);
  const header: CellHeader = {
    schemaVersion: 1,
    cellId: cellId(key),
    key,
    ...input,
  };
  await Deno.writeTextFile(
    join(dir, "cell.json"),
    JSON.stringify(header, null, 2) + "\n",
  );
  return header;
}

/** Append one task row. Never truncates — that is what makes a resume safe. */
export async function appendTask(
  dir: string,
  rec: TaskRecord,
): Promise<void> {
  await ensureDir(dir);
  await Deno.writeTextFile(
    join(dir, "tasks.jsonl"),
    JSON.stringify(rec) + "\n",
    { append: true },
  );
}

/**
 * Read a cell. Rows collapse to the LAST one per (rep, instance); the file
 * keeps every row, so the history stays auditable.
 */
export async function readCell(dir: string): Promise<Cell> {
  let header: CellHeader;
  try {
    header = JSON.parse(
      await Deno.readTextFile(join(dir, "cell.json")),
    ) as CellHeader;
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
    header = null as unknown as CellHeader;
  }

  const byKey = new Map<string, TaskRecord>();
  try {
    const raw = await Deno.readTextFile(join(dir, "tasks.jsonl"));
    for (const line of raw.split("\n")) {
      if (line.trim() === "") continue;
      const rec = JSON.parse(line) as TaskRecord;
      byKey.set(`${rec.rep} ${rec.instanceId}`, rec);
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  return { header, tasks: [...byKey.values()] };
}

export interface RateCounts {
  measured: number;
  resolved: number;
  pending: number;
  excluded: number;
}

/**
 * Solve counts for one rep.
 *
 * THROWS when tasks are still pending: a rate over a partial set is precisely
 * the 2026-07-25 mistake, where 45 never-attempted instances were invisible and
 * the remaining ones looked like the whole pool. Pass `allowPartial` to say
 * out loud that an in-flight number is what you want.
 */
export function passRate(
  cell: Cell,
  rep: number,
  opts: { allowPartial?: boolean } = {},
): RateCounts {
  const rows = cell.tasks.filter((t) => t.rep === rep);
  const counts: RateCounts = {
    measured: rows.filter((t) => t.status === "measured").length,
    resolved: rows.filter((t) => t.verdict?.resolved).length,
    pending: rows.filter((t) => t.status === "pending").length,
    excluded: rows.filter((t) => t.status === "excluded").length,
  };
  if (counts.pending > 0 && !opts.allowPartial) {
    throw new Error(
      `rep ${rep} has ${counts.pending} pending task(s) — a pass rate over a ` +
        `partial set misreports the pool; finish the run or pass allowPartial`,
    );
  }
  return counts;
}
