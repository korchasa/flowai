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
import {
  baselineTask,
  commandPrefixFor,
  planTurn,
  replanTurn,
  reviewTurn,
} from "./operator.ts";
import {
  implementTurnWithVerdict,
  operatorMessages,
} from "./human_emulator.ts";

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
  /**
   * Whole-session budget in ms. Optional: absent means the legacy 20 minutes,
   * which is also what every cell written before 2026-08-01 ran under.
   */
  stepTimeoutMs?: number;
  /**
   * `promptHashFor(ide, arm)`. Optional: absent means the cell does not know
   * what wording produced it — true of every record written before 2026-08-02,
   * and of imports from the pre-cell layout, which captured no prompt at all.
   */
  promptHash?: string;
  /**
   * The human emulator that judged the run. Optional: absent means the legacy
   * referee (`sonnet`), which is what every cell written before 2026-08-09 ran
   * under. Two campaigns judged by different emulators are not one measurement
   * — see `emulatorSegment`.
   */
  humanEmulator?: { model: string; effort: string };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * The one budget whose segment is omitted from `cellId`.
 *
 * This is a compatibility anchor, NOT the current default (that is
 * `SESSION_BUDGET_MS`, 40 min). Every cell on disk was written at 20 minutes
 * under a key that had no budget in it; anchoring the omission here keeps those
 * directory names byte-identical instead of orphaning them behind a rename.
 * Same idiom as `campaignRunId`, which suffixes only attempts after the first.
 */
export const LEGACY_CELL_STEP_TIMEOUT_MS = 1_200_000;

/** `2_400_000` → `t40m`; a budget that is not whole minutes keeps its ms. */
function budgetSegment(ms: number): string {
  return ms % 60_000 === 0 ? `t${ms / 60_000}m` : `t${ms}ms`;
}

/**
 * The one referee whose segment is omitted from `cellId`.
 *
 * Compatibility anchor, not the current default (that is `gpt-5.6-sol` at a
 * pinned medium — `humanEmulatorConfig`). Every cell on disk was judged by
 * `sonnet` under a key that had no referee in it; anchoring the omission here
 * keeps those directory names byte-identical. Same idiom as the budget.
 */
export const LEGACY_CELL_EMULATOR_MODEL = "sonnet";

/**
 * `{gpt-5.6-sol, medium}` → `egpt-5-6-sol-medium`; the legacy referee → omitted.
 *
 * The EFFORT is in the segment as well as the model, because a referee moved
 * from medium to high judges differently even under the same name — and the
 * effort stopped tracking the agent's on 2026-08-09, so it is now an
 * independent property of the campaign rather than a restatement of `effort`.
 */
function emulatorSegment(
  e: { model: string; effort: string },
): string | undefined {
  if (e.model === LEGACY_CELL_EMULATOR_MODEL) return undefined;
  return `e${e.model}-${e.effort}`;
}

/**
 * Directory name for a cell. Every key component appears, so no two
 * configurations can land in one record.
 *
 * The session budget earned its place in the key the hard way: it sat in the
 * header as a mere condition while it was in fact load-bearing — the 20-minute
 * cap was free for baseline (0 of 198 sessions reached it) and binding for
 * flowai (11 of 45), so a cell blending both budgets would describe no single
 * measurement. Re-measured data now lands in its own record.
 *
 * The prompt hash joined it for the same reason and by the same rule: the
 * harness's own wording moves results, so a rewritten turn is a new
 * measurement. A key that omits the hash is saying it does not know its
 * wording, which is the honest state of everything measured before the hash
 * became part of the identity — those directories keep their names.
 */
export function cellId(key: CellKey): string {
  const budget = key.stepTimeoutMs ?? LEGACY_CELL_STEP_TIMEOUT_MS;
  return [
    key.ide,
    key.arm,
    key.framework ?? "none",
    key.model,
    key.effort,
    ...(budget === LEGACY_CELL_STEP_TIMEOUT_MS ? [] : [budgetSegment(budget)]),
    ...(key.promptHash ? [`p${key.promptHash.slice(0, 12)}`] : []),
    ...(key.humanEmulator
      ? [emulatorSegment(key.humanEmulator)].filter((x) => x !== undefined)
      : []),
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
  emulatorPath?: string;
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

/**
 * Schema 1 named this field `judge`, which collided with the two things that
 * really do judge — swebench's verdict and the acceptance-test grader. Schema 2
 * calls it what it is: the LLM that plays the human across turns.
 */
export const CELL_SCHEMA_VERSION = 2;

export interface CellHeader {
  schemaVersion: number;
  cellId: string;
  key: CellKey;
  taskSet: CellTaskSet;
  agent: CellAgent;
  /** The LLM playing the human operator — never the thing that grades. */
  humanEmulator: { model: string; effort: string };
  harness: CellHarness;
  env: CellEnv;
  reps: CellRep[];
}

/**
 * implements [FR-BENCH-SWE.CELLS](../../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
 * Bring a header written under an older schema up to the current one.
 *
 * A rename is not worth losing a campaign to: the cells on disk hold pins that
 * cannot be re-measured, so an old header is migrated, never rejected. Schema 1
 * → 2 moves `judge` to `humanEmulator` and drops the old key, so nothing carries
 * both names.
 */
export function migrateHeader(raw: CellHeader): CellHeader {
  if (raw === null || raw.schemaVersion === CELL_SCHEMA_VERSION) return raw;
  const legacy = raw as unknown as
    & { judge?: { model: string; effort: string } }
    & CellHeader;
  const { judge, ...rest } = legacy;
  return {
    ...rest,
    humanEmulator: rest.humanEmulator ?? judge ??
      { model: "unknown", effort: "unknown" },
    schemaVersion: CELL_SCHEMA_VERSION,
  };
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
 * The TEMPLATE handed to the agent over a whole session: placeholders instead
 * of the actual repo and issue, plus the IDE's skill-invocation prefix.
 *
 * It is arm-specific because the arms do not send the same thing. The bare arm
 * IS its task text and nothing more. The flowai arm sends a sequence of turns
 * that the operator authors, so its prompt surface is `plan` → `implement` →
 * `review` (plus the re-plan turn) AND the operator system prompt that decides
 * between them. Hashing only the task text — which is what this did until
 * 2026-08-02 — meant the review turn could be rewritten end to end and every
 * cell would still claim the same prompt.
 */
export function promptTemplateFor(ide: string, arm: string = "baseline") {
  const prefix = commandPrefixFor(ide);
  const base = baselineTask("<REPO>", "<ISSUE>") + `\nprefix=${prefix}`;
  if (arm === "baseline") return base;
  return [
    base,
    planTurn("<REPO>", "<ISSUE>", prefix),
    replanTurn("<FEEDBACK>", prefix),
    implementTurnWithVerdict("<VERDICT>", prefix),
    reviewTurn("<FEEDBACK>", prefix),
    operatorMessages("<ISSUE>", "<OUTPUT>").map((m) => m.content).join("\n"),
  ].join("\n---\n");
}

/**
 * Hash of {@link promptTemplateFor}. Wording moves results, so a silent prompt
 * edit must show up as a different cell.
 */
export async function promptHashFor(
  ide: string,
  arm: string = "baseline",
): Promise<string> {
  return (await taskSetChecksum([promptTemplateFor(ide, arm)])).slice(0, 16);
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

/**
 * Harness commit that produced a measurement — `unknown` when git cannot say,
 * and suffixed `-dirty` when the worktree differs from it.
 *
 * The field answers "which code produced this number". A run off an
 * uncommitted tree did not run the code at HEAD, so a bare sha there is the
 * same lie `frameworkFingerprint` refuses to tell — and it was told on the
 * first flowai campaign (2026-07-27).
 */
export async function currentCommit(
  repoRoot: string = Deno.cwd(),
): Promise<string> {
  const sha = await capture("git", [
    "-C",
    repoRoot,
    "rev-parse",
    "--short",
    "HEAD",
  ]);
  if (sha === null) return "unknown";
  const dirty = await capture("git", ["-C", repoRoot, "status", "--porcelain"]);
  return dirty ? `${sha}-dirty` : sha;
}

/**
 * implements [FR-BENCH-SWE.CELLS](../../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
 * Fingerprint of the framework the flowai arm installs — the `framework` half of
 * the cell key.
 *
 * It is the git TREE hash of `framework/`, not the harness commit: the harness
 * and the framework move independently, and a commit sha would let a run off an
 * uncommitted tree claim the last commit's identity. A dirty worktree is
 * reported as such rather than silently folded into the clean fingerprint — the
 * cell then says plainly that its framework was not a committed state.
 */
export async function frameworkFingerprint(
  repoRoot: string = Deno.cwd(),
): Promise<string> {
  const tree = await capture("git", [
    "-C",
    repoRoot,
    "rev-parse",
    "HEAD:framework",
  ]);
  if (tree === null) return "unknown";
  const dirty = await capture("git", [
    "-C",
    repoRoot,
    "status",
    "--porcelain",
    "--",
    "framework",
  ]);
  return tree.slice(0, 12) + (dirty ? "-dirty" : "");
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

/**
 * implements [FR-BENCH-SWE.CELLS](../../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
 * Fold a rep's latest run into the header's rep list without erasing what the
 * earlier run recorded.
 *
 * A rep row describes the WHOLE measurement of that rep, across every attempt.
 * Rewriting it wholesale on a resume is how a regrade pass made rep 1 of the
 * first flowai campaign claim a 0.3-second runtime with zero health aborts
 * (measured 2026-07-27) — the second pass ran no sessions, so its own numbers
 * were vacuously true and destroyed the real ones. Hence: the FIRST start is
 * the start, the LATEST finish is the finish, and the guard counters add up.
 */
export function mergeRep(
  prior: readonly CellRep[],
  incoming: CellRep,
): CellRep[] {
  const previous = prior.find((r) => r.rep === incoming.rep);
  const merged: CellRep = previous
    ? {
      ...incoming,
      startedAt: previous.startedAt || incoming.startedAt,
      healthAborts: previous.healthAborts + incoming.healthAborts,
      backoffWaits: previous.backoffWaits + incoming.backoffWaits,
    }
    : incoming;
  return [...prior.filter((r) => r.rep !== incoming.rep), merged]
    .sort((a, b) => a.rep - b.rep);
}

export async function writeHeader(
  dir: string,
  key: CellKey,
  input: CellHeaderInput,
): Promise<CellHeader> {
  await ensureDir(dir);
  const header: CellHeader = {
    schemaVersion: CELL_SCHEMA_VERSION,
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
    header = migrateHeader(
      JSON.parse(await Deno.readTextFile(join(dir, "cell.json"))) as CellHeader,
    );
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
