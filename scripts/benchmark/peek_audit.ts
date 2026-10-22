/**
 * Cross-session peek audit for benchmark runs (FR-BENCH-SWE.ISOLATION).
 *
 * The agent under test and the human emulator each write a session transcript
 * (a codex rollout, or a Claude Code transcript), and neither has any
 * legitimate reason to READ one. The agent's rollout carries the
 * reasoning the emulator must never see; the emulator's carries the human
 * persona and the `DECISION:` protocol the agent is graded through. Codex offers
 * no sandbox mode that denies disk reads (measured on codex-cli 0.144.6: a
 * `--sandbox read-only` session read `~/.zshrc`), so prevention stops at
 * removing the pointer — this module supplies the check that it held.
 *
 * Claude Code has no read-only mode that denies disk reads either, and it reads
 * files with its own tools as well as the shell, so its surface is `Bash`
 * commands plus the paths `Read`, `Grep` and `Glob` take.
 *
 * The detector is deliberately COARSE: it flags any command or path whose text
 * mentions a session store at all, rather than trying to decide whose
 * store it was. Under a shared home a path tells you nothing about ownership,
 * and under separate homes an agent that walks the temp root reaches the other
 * store by a path this harness never chose. Reading rollouts is not part of
 * solving a GitHub issue in either case.
 *
 * Same discipline as the web audit: flags are DISCLOSURE, never automatic
 * exclusion — a flagged instance is one a human should look at.
 */

import { join } from "@std/path";
import { type SessionStores, storeFiles } from "./session_store.ts";
import {
  claudeToolCallsFromTranscript,
  shellCommandsFromRollout,
} from "./webaudit.ts";

export interface SessionPeek {
  /** `Shell` for a codex shell command; the Claude tool name otherwise. */
  tool: "Shell" | "Bash" | "Read" | "Grep" | "Glob";
  /** The command text or tool path, truncated — enough to judge, short enough
   * to read. */
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
 * Markers of a session store in a command's text. Codex: `rollout-` is the
 * filename prefix it writes, and the rest are the directories those files live
 * in. Claude Code: `.claude/projects` holds every transcript, and the human
 * emulator's sessions sit there under a slug of its temp cwd, whose prefix
 * the benchmark chooses (`flowai-operator-`, `answer-emulator-`). `bench-home`
 * is the isolated `HOME` both IDEs run under. The skill dir
 * `.claude/skills/` the agent legitimately reads matches none of them.
 */
const PEEK_MARKERS = [
  "rollout-",
  ".codex/sessions",
  "CODEX_HOME",
  "bench-home",
  "flowai-bench-emulator",
  ".claude/projects",
  "CLAUDE_CONFIG_DIR",
  "flowai-operator-",
  "answer-emulator-",
] as const;

/** The store marker a command mentions, or `undefined` when it mentions none. */
export function sessionPeekMarker(command: string): string | undefined {
  return PEEK_MARKERS.find((m) => command.includes(m));
}

function peek(
  tool: SessionPeek["tool"],
  text: string,
): SessionPeek | undefined {
  const matched = sessionPeekMarker(text);
  if (matched === undefined) return undefined;
  return {
    tool,
    command: text.length > MAX_COMMAND_CHARS
      ? text.slice(0, MAX_COMMAND_CHARS) + "…"
      : text,
    matched,
  };
}

/** Extract every shell command that reaches for a session store. */
export function peeksFromRollout(
  text: string,
): { peeks: SessionPeek[]; parseErrors: number } {
  const { commands, parseErrors } = shellCommandsFromRollout(text);
  const peeks = commands.map((c) => peek("Shell", c)).filter((p) =>
    p !== undefined
  );
  return { peeks, parseErrors };
}

/** The text a Claude Code tool call reads by: a command or a path. */
function claudeReadTarget(name: string, input: Record<string, unknown>) {
  const str = (k: string) =>
    typeof input[k] === "string" ? input[k] as string : undefined;
  switch (name) {
    case "Bash":
      return str("command");
    case "Read":
      return str("file_path");
    case "Grep":
    case "Glob":
      return [str("path"), str("pattern")].filter(Boolean).join(" ") ||
        undefined;
    default:
      return undefined;
  }
}

/** Extract every Claude Code command or file-tool path that reaches for a
 * session store. */
export function peeksFromClaudeTranscript(
  text: string,
): { peeks: SessionPeek[]; parseErrors: number } {
  const { calls, parseErrors } = claudeToolCallsFromTranscript(text);
  const peeks: SessionPeek[] = [];
  for (const c of calls) {
    if (!["Bash", "Read", "Grep", "Glob"].includes(c.name)) continue;
    const target = claudeReadTarget(c.name, c.input);
    if (target === undefined) continue;
    const p = peek(c.name as SessionPeek["tool"], target);
    if (p) peeks.push(p);
  }
  return { peeks, parseErrors };
}

/**
 * Harvest every transcript of the run's session store and report the commands
 * that reached for a session store. Fails fast, naming the offending
 * directory, when one is absent — the same rule as the cost and web harvests,
 * for the same reason: no transcript is a harness defect, not proof that
 * nobody peeked.
 */
export async function collectPeekAudit(
  stores: SessionStores,
  instanceId: string,
): Promise<InstanceSessionAudit> {
  const files = await storeFiles(stores);
  const audit: InstanceSessionAudit = {
    instanceId,
    transcriptFiles: 0,
    parseErrors: 0,
    peeks: [],
    peekCount: 0,
  };
  for (const file of files) {
    const extract = file.ide === "codex"
      ? peeksFromRollout
      : peeksFromClaudeTranscript;
    const { peeks, parseErrors } = extract(
      await Deno.readTextFile(file.path),
    );
    audit.transcriptFiles++;
    audit.parseErrors += parseErrors;
    audit.peeks.push(...peeks);
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
