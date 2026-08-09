/**
 * Cross-session peek audit for benchmark runs (FR-BENCH-SWE.ISOLATION).
 *
 * The agent under test and the human emulator each write a codex rollout, and
 * neither has any legitimate reason to READ one. The agent's rollout carries the
 * reasoning the emulator must never see; the emulator's carries the human
 * persona and the `DECISION:` protocol the agent is graded through. Codex offers
 * no sandbox mode that denies disk reads (measured on codex-cli 0.144.6: a
 * `--sandbox read-only` session read `~/.zshrc`), so prevention stops at
 * removing the pointer — this module supplies the check that it held.
 *
 * The detector is deliberately COARSE: it flags any shell command whose text
 * mentions a codex session store at all, rather than trying to decide whose
 * store it was. Under a shared home a path tells you nothing about ownership,
 * and under separate homes an agent that walks the temp root reaches the other
 * store by a path this harness never chose. Reading rollouts is not part of
 * solving a GitHub issue in either case.
 *
 * Same discipline as the web audit: flags are DISCLOSURE, never automatic
 * exclusion — a flagged instance is one a human should look at.
 */

import { join } from "@std/path";
import { walk } from "@std/fs";
import { shellCommandsFromRollout } from "./webaudit.ts";

export interface SessionPeek {
  /** Only the shell reads files under codex. */
  tool: "Shell";
  /** The command text, truncated — enough to judge, short enough to read. */
  command: string;
  /** The substring that triggered the flag. */
  matched: string;
}

export interface InstanceSessionAudit {
  instanceId: string;
  transcriptFiles: number;
  parseErrors: number;
  peeks: SessionPeek[];
  peekCount: number;
}

const MAX_COMMAND_CHARS = 400;

/**
 * Markers of a codex session store in a command's text. `rollout-` is the
 * filename prefix codex writes; the rest are the directories those files live
 * in, including the two the benchmark builds itself.
 */
const PEEK_MARKERS = [
  "rollout-",
  ".codex/sessions",
  "CODEX_HOME",
  "bench-home",
  "flowai-bench-emulator",
] as const;

/** The store marker a command mentions, or `undefined` when it mentions none. */
export function sessionPeekMarker(command: string): string | undefined {
  return PEEK_MARKERS.find((m) => command.includes(m));
}

/** Extract every shell command that reaches for a session store. */
export function peeksFromRollout(
  text: string,
): { peeks: SessionPeek[]; parseErrors: number } {
  const { commands, parseErrors } = shellCommandsFromRollout(text);
  const peeks: SessionPeek[] = [];
  for (const command of commands) {
    const matched = sessionPeekMarker(command);
    if (matched === undefined) continue;
    peeks.push({
      tool: "Shell",
      command: command.length > MAX_COMMAND_CHARS
        ? command.slice(0, MAX_COMMAND_CHARS) + "…"
        : command,
      matched,
    });
  }
  return { peeks, parseErrors };
}

/**
 * Harvest every rollout under `<codexHome>/sessions` for each store listed and
 * report the commands that reached for a session store. Fails fast, naming the
 * offending store, when a sessions dir is absent — the same rule as the cost and
 * web harvests, for the same reason: no rollout is a harness defect, not proof
 * that nobody peeked.
 */
export async function collectPeekAudit(
  codexHomes: readonly string[],
  instanceId: string,
): Promise<InstanceSessionAudit> {
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
  const audit: InstanceSessionAudit = {
    instanceId,
    transcriptFiles: 0,
    parseErrors: 0,
    peeks: [],
    peekCount: 0,
  };
  for (const dir of sessionDirs) {
    for await (
      const entry of walk(dir, { includeDirs: false, exts: [".jsonl"] })
    ) {
      const { peeks, parseErrors } = peeksFromRollout(
        await Deno.readTextFile(entry.path),
      );
      audit.transcriptFiles++;
      audit.parseErrors += parseErrors;
      audit.peeks.push(...peeks);
    }
  }
  audit.peekCount = audit.peeks.length;
  return audit;
}

/**
 * Load persisted per-instance peek audits from a run dir:
 * `<out>/<arm>/<instanceId>/<instanceId>.peekaudit.json`. Arms without audit
 * files are simply absent (campaigns run before the check existed).
 */
export async function loadRunPeekAudits(
  outDir: string,
): Promise<Partial<Record<string, InstanceSessionAudit[]>>> {
  const byArm: Partial<Record<string, InstanceSessionAudit[]>> = {};
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
      const path = join(armDir, e.name, `${e.name}.peekaudit.json`);
      let raw: string;
      try {
        raw = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      (byArm[arm] ??= []).push(JSON.parse(raw) as InstanceSessionAudit);
    }
    byArm[arm]?.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  }
  return byArm;
}
