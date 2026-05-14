#!/usr/bin/env -S deno run --allow-read --allow-env

/**
 * flowai-memex-status hook: SessionStart probe.
 *
 * If the current working directory is inside a memex (an ancestor
 * contains both `AGENTS.md` and a `pages/` subdirectory), inject a
 * one-block status summary into the agent's context: page count,
 * source count, last log entry, last audit date, plus a save-nudge
 * if too many raw sources have not yet been integrated into memex pages.
 *
 * Always exits 0. Outputs a JSON object with `additionalContext` if
 * a memex is found, or empty object otherwise. Reads only.
 */

import { dirname, resolve } from "jsr:@std/path";

interface Status {
  root: string;
  pageCount: number;
  sourceCount: number;
  lastLog: string | null;
  lastAuditDate: string | null;
  uncompiled: number;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Walk up from `start` looking for the first ancestor with both AGENTS.md and pages/. */
async function findMemexRoot(start: string): Promise<string | null> {
  let cur = resolve(start);
  // Cap to filesystem root.
  while (true) {
    const hasAgents = await pathExists(`${cur}/AGENTS.md`);
    const hasPages = await pathExists(`${cur}/pages`);
    if (hasAgents && hasPages) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

async function countMd(dir: string): Promise<number> {
  let count = 0;
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        if (entry.name === "index.md" || entry.name === "log.md") continue;
        count++;
      }
    }
  } catch { /* missing dir = 0 */ }
  return count;
}

async function readLastLogEntry(logPath: string): Promise<string | null> {
  try {
    const text = await Deno.readTextFile(logPath);
    const matches = [
      ...text.matchAll(/^## \[(\d{4}-\d{2}-\d{2})\] (\w+) \| (.+)$/gm),
    ];
    if (matches.length === 0) return null;
    const last = matches[matches.length - 1];
    return `${last[1]} ${last[2]}: ${last[3]}`;
  } catch {
    return null;
  }
}

async function readLastAuditDate(logPath: string): Promise<string | null> {
  try {
    const text = await Deno.readTextFile(logPath);
    const matches = [
      ...text.matchAll(/^## \[(\d{4}-\d{2}-\d{2})\] audit \|/gm),
    ];
    if (matches.length === 0) return null;
    return matches[matches.length - 1][1];
  } catch {
    return null;
  }
}

/** A raw source is "uncompiled" if no memex page mentions its slug as a [[wikilink]]. */
async function countUncompiled(root: string): Promise<number> {
  const rawDir = `${root}/raw/articles`;
  const pagesDir = `${root}/pages`;
  let uncompiled = 0;
  let pagesText = "";
  try {
    for await (const entry of Deno.readDir(pagesDir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        pagesText += await Deno.readTextFile(`${pagesDir}/${entry.name}`) +
          "\n";
      }
    }
  } catch { /* no pages dir */ }
  try {
    for await (const entry of Deno.readDir(rawDir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const slug = entry.name.replace(/\.md$/, "");
      if (
        !pagesText.includes(`[[${slug}]]`) && !pagesText.includes(`[[${slug}|`)
      ) {
        uncompiled++;
      }
    }
  } catch { /* no raw dir = 0 */ }
  return uncompiled;
}

export async function gatherStatus(root: string): Promise<Status> {
  const [pageCount, sourceCount, lastLog, lastAuditDate, uncompiled] =
    await Promise.all([
      countMd(`${root}/pages`),
      countMd(`${root}/raw/articles`),
      readLastLogEntry(`${root}/log.md`),
      readLastAuditDate(`${root}/log.md`),
      countUncompiled(root),
    ]);
  return { root, pageCount, sourceCount, lastLog, lastAuditDate, uncompiled };
}

export function formatStatus(s: Status): string {
  const lines: string[] = [
    `[memex] Active memex detected at ${s.root}`,
    `[memex] ${s.pageCount} memex pages, ${s.sourceCount} raw sources.`,
  ];
  if (s.lastLog) lines.push(`[memex] Last log: ${s.lastLog}`);
  if (s.lastAuditDate) {
    lines.push(`[memex] Last audit: ${s.lastAuditDate}`);
  } else if (s.pageCount > 0) {
    lines.push(
      `[memex] No audit recorded yet — consider running flowai-memex-audit.`,
    );
  }
  if (s.uncompiled >= 5) {
    lines.push(
      `[memex] ${s.uncompiled} uncompiled raw sources (no memex page references them). Consider re-running flowai-memex-save on them.`,
    );
  }
  lines.push(
    `[memex] Skills: flowai-memex-save, flowai-memex-ask, flowai-memex-audit.`,
  );
  return lines.join("\n");
}

if (import.meta.main) {
  let inputJson = "";
  try {
    inputJson = await new Response(Deno.stdin.readable).text();
  } catch { /* no stdin */ }
  let input: { cwd?: string } = {};
  try {
    input = inputJson ? JSON.parse(inputJson) : {};
  } catch { /* malformed = use defaults */ }
  const cwd = input.cwd || Deno.env.get("CLAUDE_PROJECT_DIR") || Deno.cwd();
  const root = await findMemexRoot(cwd);
  if (!root) {
    console.log(JSON.stringify({}));
    Deno.exit(0);
  }
  const status = await gatherStatus(root);
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: formatStatus(status),
    },
  }));
}
