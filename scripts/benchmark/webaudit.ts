/**
 * Per-instance web-access audit for benchmark runs (FR-BENCH-SWE.WEBAUDIT).
 *
 * Research is normal agent work (user decision 2026-07-22) — web access is
 * AUDITED, never banned. The risk being audited: a benchmark instance's real
 * upstream fix is public on GitHub during the run, so an unlogged fetch of the
 * own-repo PR/commit is an invisible oracle leak. This module extracts every
 * `http(s)` URL from the shell commands recorded in the codex rollouts — the
 * agent's store AND the human emulator's, which FR-BENCH-SWE.ISOLATION keeps
 * apart but which are equally auditable (the emulator's `--sandbox read-only`
 * blocks writes, not the network) — and flags oracle-adjacent targets for human
 * review. Flags are disclosure, not disqualification: false positives are
 * acceptable and no automatic exclusion happens.
 *
 * The shell IS the whole audit surface here. The retired Claude reader also had
 * `WebFetch` URLs and `WebSearch` queries to read, but codex has no such tools
 * in the bench sandbox — it reaches the network through `exec_command` /
 * `shell_command`, whose argument carries the command text verbatim. Measured
 * across every rollout on this host: 33465 `exec_command` records (field `cmd`)
 * and 5588 `shell_command` records (field `command`), all string-valued.
 * Consequence stated, not hidden: a search the model performs internally, with
 * no shell command, leaves no trace here.
 *
 * Same rollout discipline as metrics.ts (FR-BENCH-SWE.COST): tool calls repeat
 * across retries → dedupe by `call_id`; malformed lines are counted
 * (`parseErrors`), never dropped; harvest runs IMMEDIATELY after the session
 * because the OS purges both session roots within days.
 */

import { join } from "@std/path";
import { walk } from "@std/fs";

export interface WebAccess {
  /** Only the shell reaches the network under codex. */
  tool: "Shell";
  /** The URL found in the command text. */
  target: string;
  /** Oracle-adjacent — needs human review in the report. */
  flagged: boolean;
}

export interface InstanceWebAudit {
  instanceId: string;
  repo: string;
  transcriptFiles: number;
  parseErrors: number;
  accesses: WebAccess[];
  flaggedCount: number;
}

const URL_RE = /https?:\/\/[^\s"'`<>)\]]+/g;

/**
 * Oracle-adjacent test: the target references the instance's own repo
 * `pull`/`commit`/`issues` paths on GitHub, OR combines the repo's short name
 * with the instance's ticket number (catches search queries like
 * "django 16454 fix" and tracker URLs like code.djangoproject.com/ticket/16454).
 * Deliberately over-approximate — a flag means "look at this", not "cheated".
 */
export function isOracleAdjacent(
  target: string,
  repo: string,
  instanceId: string,
): boolean {
  const t = target.toLowerCase();
  const r = repo.toLowerCase();
  if (
    t.includes(`github.com/${r}/pull/`) ||
    t.includes(`github.com/${r}/commit/`) ||
    t.includes(`github.com/${r}/issues/`)
  ) {
    return true;
  }
  const short = r.split("/").pop() ?? r;
  const ticket = instanceId.match(/(\d+)$/)?.[1];
  return ticket !== undefined && t.includes(short) &&
    new RegExp(`\\b${ticket}\\b`).test(t);
}

/** Extract deduped, flagged web accesses from one transcript's jsonl text. */
export function accessesFromRollout(
  text: string,
  repo: string,
  instanceId: string,
): { accesses: WebAccess[]; parseErrors: number } {
  const { commands, parseErrors } = shellCommandsFromRollout(text);
  const accesses: WebAccess[] = [];
  for (const cmd of commands) {
    for (const url of cmd.match(URL_RE) ?? []) {
      accesses.push({
        tool: "Shell",
        target: url,
        flagged: isOracleAdjacent(url, repo, instanceId),
      });
    }
  }
  return { accesses, parseErrors };
}

/**
 * Every shell command one rollout recorded, deduped by call id.
 *
 * Shared with the cross-session peek audit (FR-BENCH-SWE.ISOLATION) — both
 * checks ask a different question of the SAME command text, and a second parser
 * would be a second place for the `exec_command`/`shell_command` field-name
 * difference to be got wrong.
 */
export function shellCommandsFromRollout(
  text: string,
): { commands: string[]; parseErrors: number } {
  // Dedupe at the call level (codex repeats a tool call across retries) —
  // last occurrence wins, matching metrics.ts.
  const callsById = new Map<string, string>();
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
    if (payload.type !== "function_call") continue;
    if (payload.name !== "exec_command" && payload.name !== "shell_command") {
      continue;
    }
    const id = typeof payload.call_id === "string"
      ? payload.call_id
      : typeof payload.id === "string"
      ? payload.id
      : undefined;
    if (id === undefined) continue;
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(
        typeof payload.arguments === "string" ? payload.arguments : "{}",
      ) as Record<string, unknown>;
    } catch {
      parseErrors++;
      continue;
    }
    // `exec_command` names it `cmd`, `shell_command` names it `command`.
    const cmd = typeof args.cmd === "string"
      ? args.cmd
      : typeof args.command === "string"
      ? args.command
      : undefined;
    if (cmd !== undefined) callsById.set(id, cmd);
  }

  return { commands: [...callsById.values()], parseErrors };
}

/**
 * Harvest every rollout under `<codexHome>/sessions` for each store listed — the
 * agent's and the human emulator's, which FR-BENCH-SWE.ISOLATION keeps separate.
 * Fails fast, naming the offending store, when a sessions dir is absent: a
 * session with no rollout is a harness defect, not a clean-network run.
 */
export async function collectWebAudit(
  codexHomes: readonly string[],
  repo: string,
  instanceId: string,
): Promise<InstanceWebAudit> {
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
  const audit: InstanceWebAudit = {
    instanceId,
    repo,
    transcriptFiles: 0,
    parseErrors: 0,
    accesses: [],
    flaggedCount: 0,
  };
  for (const dir of sessionDirs) {
    for await (
      const entry of walk(dir, { includeDirs: false, exts: [".jsonl"] })
    ) {
      const { accesses, parseErrors } = accessesFromRollout(
        await Deno.readTextFile(entry.path),
        repo,
        instanceId,
      );
      audit.transcriptFiles++;
      audit.parseErrors += parseErrors;
      audit.accesses.push(...accesses);
    }
  }
  audit.flaggedCount = audit.accesses.filter((a) => a.flagged).length;
  return audit;
}

/**
 * Load persisted per-instance audits from a run dir:
 * `<out>/<arm>/<instanceId>/<instanceId>.webaudit.json`. Arms without audit
 * files are simply absent (old campaigns predate the audit).
 */
export async function loadRunWebAudits(
  outDir: string,
): Promise<Partial<Record<string, InstanceWebAudit[]>>> {
  const byArm: Partial<Record<string, InstanceWebAudit[]>> = {};
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
      const path = join(armDir, e.name, `${e.name}.webaudit.json`);
      let raw: string;
      try {
        raw = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      (byArm[arm] ??= []).push(JSON.parse(raw) as InstanceWebAudit);
    }
    byArm[arm]?.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  }
  return byArm;
}
