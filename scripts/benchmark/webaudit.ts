/**
 * Per-instance web-access audit for benchmark runs (FR-BENCH-SWE.WEBAUDIT).
 *
 * Research is normal agent work (user decision 2026-07-22) — web access is
 * AUDITED, never banned. The risk being audited: a benchmark instance's real
 * upstream fix is public on GitHub during the run, so an unlogged fetch of the
 * own-repo PR/commit is an invisible oracle leak. This module reads every
 * transcript of the run's session store (`session_store.ts`) — the agent's
 * AND the human emulator's, which are equally auditable — and flags
 * oracle-adjacent targets for human review. Flags are disclosure, not
 * disqualification: false positives are acceptable and no automatic exclusion
 * happens.
 *
 * The audit surface differs per subject IDE:
 *
 * - codex has no web tools in the bench sandbox; it reaches the network
 *   through `exec_command` / `shell_command`, whose argument carries the
 *   command text verbatim (measured across every rollout on this host: 33465
 *   `exec_command` records, field `cmd`, and 5588 `shell_command` records,
 *   field `command`, all string-valued). Every `http(s)` URL in that text is an
 *   access. A search the model performs internally, with no shell command,
 *   leaves no trace.
 * - Claude Code has `WebFetch` (a URL) and `WebSearch` (a query) next to
 *   `Bash`, whose `command` is scanned for URLs like a codex shell command.
 *
 * Same discipline as metrics.ts (FR-BENCH-SWE.COST): tool calls repeat across
 * retries and content-block lines → dedupe by call id (`call_id` on codex, the
 * `tool_use` block id on Claude); malformed lines are counted (`parseErrors`),
 * never dropped; harvest runs IMMEDIATELY after the session because the OS
 * purges temp-root stores within days.
 */

import { join } from "@std/path";
import { type SessionStores, storeFiles } from "./session_store.ts";

export interface WebAccess {
  /** A shell command (codex shell tools, Claude `Bash`) or a Claude web tool. */
  tool: "Shell" | "WebFetch" | "WebSearch";
  /** The URL (shell, WebFetch) or the search query (WebSearch). */
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

/** One Claude Code tool call: the `tool_use` block's id, name and input. */
export interface ClaudeToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Every tool call one Claude Code transcript recorded, deduped by the
 * `tool_use` block id (a response repeats its blocks across the lines that
 * share its `message.id`), last occurrence wins. Shared with the peek audit
 * for the same reason `shellCommandsFromRollout` is.
 */
export function claudeToolCallsFromTranscript(
  text: string,
): { calls: ClaudeToolCall[]; parseErrors: number } {
  const byId = new Map<string, ClaudeToolCall>();
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
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (b.type !== "tool_use" || typeof b.id !== "string") continue;
      const input = b.input && typeof b.input === "object"
        ? b.input as Record<string, unknown>
        : {};
      byId.set(b.id, { id: b.id, name: String(b.name ?? ""), input });
    }
  }
  return { calls: [...byId.values()], parseErrors };
}

/** Extract deduped, flagged web accesses from one Claude Code transcript. */
export function accessesFromClaudeTranscript(
  text: string,
  repo: string,
  instanceId: string,
): { accesses: WebAccess[]; parseErrors: number } {
  const { calls, parseErrors } = claudeToolCallsFromTranscript(text);
  const accesses: WebAccess[] = [];
  const push = (tool: WebAccess["tool"], target: string) =>
    accesses.push({
      tool,
      target,
      flagged: isOracleAdjacent(target, repo, instanceId),
    });
  for (const c of calls) {
    if (c.name === "WebFetch" && typeof c.input.url === "string") {
      push("WebFetch", c.input.url);
    } else if (c.name === "WebSearch" && typeof c.input.query === "string") {
      push("WebSearch", c.input.query);
    } else if (c.name === "Bash" && typeof c.input.command === "string") {
      for (const url of c.input.command.match(URL_RE) ?? []) push("Shell", url);
    }
  }
  return { accesses, parseErrors };
}

/**
 * Harvest every transcript of the run's session store — the agent's and the
 * human emulator's. Fails fast, naming the offending directory, when one is
 * absent: a session with no transcript is a harness defect, not a
 * clean-network run.
 */
export async function collectWebAudit(
  stores: SessionStores,
  repo: string,
  instanceId: string,
): Promise<InstanceWebAudit> {
  const files = await storeFiles(stores);
  const audit: InstanceWebAudit = {
    instanceId,
    repo,
    transcriptFiles: 0,
    parseErrors: 0,
    accesses: [],
    flaggedCount: 0,
  };
  for (const file of files) {
    const extract = file.ide === "codex"
      ? accessesFromRollout
      : accessesFromClaudeTranscript;
    const { accesses, parseErrors } = extract(
      await Deno.readTextFile(file.path),
      repo,
      instanceId,
    );
    audit.transcriptFiles++;
    audit.parseErrors += parseErrors;
    audit.accesses.push(...accesses);
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
