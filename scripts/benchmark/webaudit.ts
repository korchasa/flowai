/**
 * Per-instance web-access audit for benchmark runs (FR-BENCH-SWE.WEBAUDIT).
 *
 * Research is normal agent work (user decision 2026-07-22) — web access is
 * AUDITED, never banned. The risk being audited: a benchmark instance's real
 * upstream fix is public on GitHub during the run, so an unlogged fetch of the
 * own-repo PR/commit is an invisible oracle leak. This module extracts every
 * web access from the bench-home Claude Code transcripts — `WebFetch` URLs,
 * `WebSearch` queries, and `http(s)` URLs inside `Bash` commands (curl/wget
 * would otherwise bypass the audit) — and flags oracle-adjacent targets for
 * human review. Flags are disclosure, not disqualification: false positives
 * are acceptable and no automatic exclusion happens.
 *
 * Same transcript discipline as metrics.ts (FR-BENCH-SWE.COST): `tool_use`
 * blocks repeat across jsonl lines of one API response → dedupe by `toolu_*`
 * block id; malformed lines are counted (`parseErrors`), never dropped;
 * harvest runs IMMEDIATELY after the session because the OS purges bench-home
 * within days.
 */

import { join } from "@std/path";
import { walk } from "@std/fs";

export interface WebAccess {
  tool: "WebFetch" | "WebSearch" | "Bash";
  /** URL (WebFetch/Bash) or search query (WebSearch). */
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
export function accessesFromTranscript(
  text: string,
  repo: string,
  instanceId: string,
): { accesses: WebAccess[]; parseErrors: number } {
  // Dedupe at the block level (one API response repeats its tool_use blocks
  // across jsonl lines) — last occurrence wins, matching metrics.ts.
  const blocksById = new Map<string, Record<string, unknown>>();
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
      if (b.type === "tool_use" && typeof b.id === "string") {
        blocksById.set(b.id, b);
      }
    }
  }

  const accesses: WebAccess[] = [];
  const push = (tool: WebAccess["tool"], target: string): void => {
    accesses.push({
      tool,
      target,
      flagged: isOracleAdjacent(target, repo, instanceId),
    });
  };
  for (const b of blocksById.values()) {
    const input = (b.input ?? {}) as Record<string, unknown>;
    if (b.name === "WebFetch" && typeof input.url === "string") {
      push("WebFetch", input.url);
    } else if (b.name === "WebSearch" && typeof input.query === "string") {
      push("WebSearch", input.query);
    } else if (b.name === "Bash" && typeof input.command === "string") {
      for (const url of input.command.match(URL_RE) ?? []) push("Bash", url);
    }
  }
  return { accesses, parseErrors };
}

/**
 * Harvest every transcript under `<benchHome>/.claude/projects` (main session
 * + subagents + the arm's judge CLI, which shares bench-home). Fails fast when
 * the projects dir is absent — a session with no transcript is a harness
 * defect, not a clean-network run.
 */
export async function collectWebAudit(
  benchHome: string,
  repo: string,
  instanceId: string,
): Promise<InstanceWebAudit> {
  const projects = join(benchHome, ".claude", "projects");
  try {
    await Deno.stat(projects);
  } catch {
    throw new Error(`no transcripts: projects dir absent at ${projects}`);
  }
  const audit: InstanceWebAudit = {
    instanceId,
    repo,
    transcriptFiles: 0,
    parseErrors: 0,
    accesses: [],
    flaggedCount: 0,
  };
  for await (
    const entry of walk(projects, { includeDirs: false, exts: [".jsonl"] })
  ) {
    const { accesses, parseErrors } = accessesFromTranscript(
      await Deno.readTextFile(entry.path),
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
